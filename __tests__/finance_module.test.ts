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
});
