import { MockRepository } from '../src/repositories/mockRepository';
import { calculateNetSalary, calculateCompanyNetProfit } from '../src/utils/calculations';

describe('Finance, Expenses & Payroll Module Test Suite (Phase 4)', () => {
  let repo: MockRepository;

  beforeEach(() => {
    repo = new MockRepository();
  });

  describe('Operational Expense Management & Approvals', () => {
    it('creates operational expense, enforces idempotency, and transitions from Pending -> Approved -> Paid', async () => {
      const requestId = 'REQ-EXP-TEST-001';

      const exp1 = await repo.createExpense(
        {
          expenseDate: '2026-09-02',
          category: 'Software',
          description: 'Terminal Licenses & Cloud Feed',
          amount: 55000,
          paymentMethod: 'Credit_Card',
          vendor: 'Bloomberg Terminal Inc',
          status: 'Pending',
          createdBy: 'USR-00003'
        },
        requestId
      );

      // Verify idempotency
      const exp2 = await repo.createExpense(
        {
          expenseDate: '2026-09-02',
          category: 'Software',
          description: 'Terminal Licenses & Cloud Feed',
          amount: 55000,
          paymentMethod: 'Credit_Card',
          vendor: 'Bloomberg Terminal Inc',
          status: 'Pending',
          createdBy: 'USR-00003'
        },
        requestId
      );
      expect(exp1.expenseId).toBe(exp2.expenseId);

      // Approve expense
      const approved = await repo.updateExpenseStatus(exp1.expenseId, 'Approved', 'USR-00001');
      expect(approved.status).toBe('Approved');
      expect(approved.approvedBy).toBe('USR-00001');
      expect(approved.approvedAt).toBeDefined();

      // Disburse / Pay expense
      const paid = await repo.updateExpenseStatus(exp1.expenseId, 'Paid', 'USR-00001', 'TXN-CARD-9911');
      expect(paid.status).toBe('Paid');
      expect(paid.notes).toContain('TXN-CARD-9911');
    });

    it('retrieves detailed metadata for a single expense record', async () => {
      const details = await repo.getExpenseDetails('EXP-00001');
      expect(details).toBeDefined();
      expect(details?.category).toBe('Rent');
      expect(details?.amount).toBe(180000);
    });

    it('updates existing expense record particulars and category', async () => {
      const updated = await repo.updateExpense('EXP-00001', {
        amount: 195000,
        description: 'Prime Trading Office Rent (Renegotiated)',
        vendor: 'Cyber City Real Estate Ltd',
        notes: 'Includes additional parking and security deposit'
      });

      expect(updated.amount).toBe(195000);
      expect(updated.description).toBe('Prime Trading Office Rent (Renegotiated)');
      expect(updated.vendor).toBe('Cyber City Real Estate Ltd');

      const details = await repo.getExpenseDetails('EXP-00001');
      expect(details?.amount).toBe(195000);
    });

    it('deletes expense entry and ensures it is removed from list and ledger aggregation', async () => {
      const created = await repo.createExpense({
        expenseDate: '2026-09-03',
        category: 'Food',
        description: 'Wrong pantry invoice duplicate',
        amount: 12500,
        paymentMethod: 'Cash',
        status: 'Draft'
      });

      expect(await repo.getExpenseDetails(created.expenseId)).toBeDefined();

      // Delete the erroneous expense
      await repo.deleteExpense(created.expenseId);

      // Verify deletion
      expect(await repo.getExpenseDetails(created.expenseId)).toBeNull();
      const allExpenses = await repo.getExpenses();
      expect(allExpenses.some(e => e.expenseId === created.expenseId)).toBe(false);
    });
  });

  describe('Staff Payroll Invariant & Commission Consolidation', () => {
    it('enforces net salary invariant: net = basic + allowance + bonus + commission - deduction - advance', () => {
      const basic = 100000;
      const allowance = 15000;
      const bonus = 25000;
      const commission = 45000;
      const deduction = 12000;
      const advance = 5000;

      const netSalary = calculateNetSalary(basic, allowance, bonus, commission, deduction, advance);
      expect(netSalary).toBe(100000 + 15000 + 25000 + 45000 - 12000 - 5000); // 168000
    });

    it('creates salary slip, pre-loads commissions, marks them paid, and disburses salary', async () => {
      // 1. Check unpaid commissions for Vikram Sharma for 2026-09
      const staffId = 'STAFF-00002';
      const month = '2026-09';
      const unpaidComms = await repo.getStaffUnpaidCommissions(staffId, month);
      expect(unpaidComms).toBe(45000); // 27000 + 18000 from seed data

      // 2. Generate salary record
      const salary = await repo.createSalary({
        staffId,
        salaryMonth: month,
        basicSalary: 100000,
        allowance: 10000,
        bonus: 15000,
        commission: unpaidComms,
        deduction: 10000,
        advance: 0,
        netSalary: 160000,
        paymentDate: '2026-09-02',
        paymentMethod: 'Bank_Transfer',
        paymentStatus: 'Approved',
        approvedBy: 'USR-00001',
        approvedAt: new Date().toISOString()
      });

      expect(salary.netSalary).toBe(100000 + 10000 + 15000 + 45000 - 10000); // 160000
      expect(salary.salaryId).toMatch(/^SAL-\d{5}$/);

      // 3. Verify commissions for that month are now marked as Paid
      const remainingUnpaid = await repo.getStaffUnpaidCommissions(staffId, month);
      expect(remainingUnpaid).toBe(0);

      // 4. Mark salary as Paid
      const paidSalary = await repo.updateSalaryStatus(salary.salaryId, 'Paid', 'USR-00001', 'UTR-SAL-202609-001');
      expect(paidSalary.paymentStatus).toBe('Paid');
      expect(paidSalary.paymentReference).toBe('UTR-SAL-202609-001');
    });

    it('updates salary slip components and dynamically recalculates net take-home pay', async () => {
      const salary = await repo.createSalary({
        staffId: 'STAFF-00001',
        salaryMonth: '2026-08',
        basicSalary: 80000,
        allowance: 5000,
        bonus: 0,
        commission: 0,
        deduction: 2000,
        advance: 0,
        paymentDate: '2026-08-30',
        paymentMethod: 'Bank_Transfer',
        paymentStatus: 'Approved'
      });

      expect(salary.netSalary).toBe(83000);

      // Adjust allowance & add performance bonus
      const updated = await repo.updateSalary(salary.salaryId, {
        allowance: 12000,
        bonus: 25000,
        notes: 'Includes quarterly incentive'
      });

      // Basic (80000) + Allowance (12000) + Bonus (25000) - Deduction (2000) = 115000
      expect(updated.netSalary).toBe(115000);
      expect(updated.allowance).toBe(12000);
      expect(updated.bonus).toBe(25000);
      expect(updated.notes).toBe('Includes quarterly incentive');
    });

    it('deletes salary slip and restores associated commissions back to Calculated status', async () => {
      const staffId = 'STAFF-00002';
      const month = '2026-09';

      // 1. Initial state: commissions available
      const initialUnpaid = await repo.getStaffUnpaidCommissions(staffId, month);
      expect(initialUnpaid).toBe(45000);

      // 2. Generate salary slip (marks commissions as Paid)
      const salary = await repo.createSalary({
        staffId,
        salaryMonth: month,
        basicSalary: 100000,
        allowance: 10000,
        bonus: 0,
        commission: initialUnpaid,
        deduction: 0,
        advance: 0,
        paymentDate: '2026-09-02',
        paymentMethod: 'Bank_Transfer',
        paymentStatus: 'Draft'
      });

      expect(await repo.getStaffUnpaidCommissions(staffId, month)).toBe(0);

      // 3. Delete the erroneous salary slip
      await repo.deleteSalary(salary.salaryId);

      // Verify slip is deleted
      expect(await repo.getSalaryDetails(salary.salaryId)).toBeNull();

      // 4. Verify commissions have been rolled back to Calculated and are now available for re-processing!
      const restoredUnpaid = await repo.getStaffUnpaidCommissions(staffId, month);
      expect(restoredUnpaid).toBe(45000);
    });
  });

  describe('Executive Company Net Profit Aggregation Engine', () => {
    it('computes Company Net Profit strictly adhering to all revenue and cost obligations', async () => {
      const summary = await repo.getDashboardSummary('2026-09');

      const expectedNetProfit = calculateCompanyNetProfit(
        summary.trading.monthlyPnL,
        0,
        summary.investors.profitPaidMonth,
        0,
        summary.finance.expensesMonth,
        summary.finance.salariesMonth,
        0
      );

      expect(summary.finance.netCompanyProfit).toBe(expectedNetProfit);
    });
  });

  describe('Staff Profile Updates & Management', () => {
    it('updates staff details including role, department, salary, and cut rate', async () => {
      const staffId = 'STAFF-00002';
      const updated = await repo.updateStaff(staffId, {
        name: 'Vikram Sharma (Senior Trader)',
        tradingPercentage: 25,
        basicSalary: 120000,
        status: 'Active'
      });

      expect(updated.name).toBe('Vikram Sharma (Senior Trader)');
      expect(updated.tradingPercentage).toBe(25);
      expect(updated.basicSalary).toBe(120000);

      const details = await repo.getStaffDetails(staffId);
      expect(details.staff.name).toBe('Vikram Sharma (Senior Trader)');
      expect(details.staff.tradingPercentage).toBe(25);
    });
  });

  describe('Staff Multi-Bank Account Management', () => {
    it('supports multiple payout bank accounts per staff member with a designated primary account', async () => {
      const staffId = 'STAFF-00003';

      // 1. Initial seeded bank
      const initialBanks = await repo.getStaffBanks(staffId);
      expect(initialBanks.length).toBe(1);
      expect(initialBanks[0].bankName).toBe('Axis Bank');
      expect(initialBanks[0].isPrimary).toBe(true);

      // 2. Add a second bank account (HDFC Savings)
      const secondBank = await repo.addStaffBank({
        staffId,
        accountHolderName: 'Priya Patel',
        bankName: 'HDFC Bank',
        accountNumberMasked: 'XXXX XXXX 9988',
        ifscCode: 'HDFC0000551',
        accountType: 'Savings',
        upiId: 'priyapatel@okhdfcbank',
        isPrimary: false
      });

      expect(secondBank.bankId).toMatch(/^STFBANK-\d{5}$/);
      expect(secondBank.isPrimary).toBe(false);

      const updatedBanks = await repo.getStaffBanks(staffId);
      expect(updatedBanks.length).toBe(2);

      // 3. Switch primary payout account to the second bank
      const newPrimary = await repo.setPrimaryStaffBank(staffId, secondBank.bankId);
      expect(newPrimary.isPrimary).toBe(true);

      const recheckedBanks = await repo.getStaffBanks(staffId);
      const axis = recheckedBanks.find(b => b.bankName === 'Axis Bank');
      const hdfc = recheckedBanks.find(b => b.bankName === 'HDFC Bank');
      expect(axis?.isPrimary).toBe(false);
      expect(hdfc?.isPrimary).toBe(true);

      // 4. Update bank details
      const updatedHdfc = await repo.updateStaffBank(secondBank.bankId, {
        upiId: 'priya.finance@hdfcbank',
        accountHolderName: 'Priya R. Patel'
      });
      expect(updatedHdfc.upiId).toBe('priya.finance@hdfcbank');
      expect(updatedHdfc.accountHolderName).toBe('Priya R. Patel');

      // 5. Delete an account and verify remaining accounts
      await repo.deleteStaffBank(axis!.bankId);
      const remaining = await repo.getStaffBanks(staffId);
      expect(remaining.length).toBe(1);
      expect(remaining[0].bankId).toBe(secondBank.bankId);
    });
  });
});
