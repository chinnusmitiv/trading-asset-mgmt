import { MockRepository } from '../src/repositories/mockRepository';
import { maskBankAccount } from '../src/utils/masking';
import {
  calculateInvestorMonthlyReturn,
  calculateOutstandingPrincipal,
  calculateInvestorProfitPaid
} from '../src/utils/calculations';

describe('Investor Module & Invariant Test Suite', () => {
  let repo: MockRepository;

  beforeEach(() => {
    repo = new MockRepository();
  });

  describe('Multi-Tranche Investment Calculations', () => {
    it('accurately calculates expected return on multiple tranches for a single investor', async () => {
      const investorId = 'INV-00001';

      // Fetch existing seed investments
      const details = await repo.getInvestorDetails(investorId);
      expect(details.investments.length).toBe(2);

      const totalPrincipal = details.investments.reduce((sum, inv) => sum + inv.principalAmount, 0);
      expect(totalPrincipal).toBe(15000000); // 1.5 Cr (100L + 50L)

      const monthlyExpected = details.investments.reduce((sum, inv) => sum + inv.monthlyReturn, 0);
      expect(monthlyExpected).toBe(375000); // 250k + 125k

      // Add a third tranche: 25 Lakhs @ 2.0%
      const tranche3 = await repo.createInvestment({
        investorId,
        principalAmount: 2500000,
        investmentDate: '2026-09-02',
        returnPercentage: 2.0,
        monthlyReturn: calculateInvestorMonthlyReturn(2500000, 2.0, 'Monthly'),
        paymentFrequency: 'Monthly',
        status: 'Active'
      });

      expect(tranche3.monthlyReturn).toBe(50000);

      const updated = await repo.getInvestorDetails(investorId);
      expect(updated.investments.length).toBe(3);
      const newTotalPrincipal = updated.investments.reduce((sum, inv) => sum + inv.principalAmount, 0);
      expect(newTotalPrincipal).toBe(17500000);
    });

    it('calculates outstanding principal balance accurately after partial repayments', () => {
      const initialPrincipal = 20000000;
      const repaidPrincipal = 5000000;
      const outstanding = calculateOutstandingPrincipal(initialPrincipal, repaidPrincipal);
      expect(outstanding).toBe(15000000);
    });
  });

  describe('Payment Lifecycle, Totals & Idempotency', () => {
    it('enforces total_amount = principal + profit + other', async () => {
      const payment = await repo.recordPayment({
        investorId: 'INV-00001',
        investmentId: 'INVEST-00001',
        paymentDate: '2026-09-02',
        paymentMonth: '2026-09',
        principalAmount: 500000,
        profitAmount: 250000,
        otherAmount: 25000,
        totalAmount: 500000 + 250000 + 25000,
        paymentMethod: 'Bank_Transfer',
        status: 'Pending'
      });

      expect(payment.totalAmount).toBe(775000);
      expect(payment.paymentId).toMatch(/^PAY-\d{5}$/);
    });

    it('enforces idempotency on duplicate payment submissions', async () => {
      const requestId = 'REQ-DISB-DUP-TEST-001';

      const pay1 = await repo.recordPayment(
        {
          investorId: 'INV-00001',
          investmentId: 'INVEST-00001',
          paymentDate: '2026-09-02',
          paymentMonth: '2026-09',
          principalAmount: 0,
          profitAmount: 250000,
          otherAmount: 0,
          totalAmount: 250000,
          paymentMethod: 'Bank_Transfer',
          status: 'Pending'
        },
        requestId
      );

      const pay2 = await repo.recordPayment(
        {
          investorId: 'INV-00001',
          investmentId: 'INVEST-00001',
          paymentDate: '2026-09-02',
          paymentMonth: '2026-09',
          principalAmount: 0,
          profitAmount: 250000,
          otherAmount: 0,
          totalAmount: 250000,
          paymentMethod: 'Bank_Transfer',
          status: 'Pending'
        },
        requestId
      );

      expect(pay1.paymentId).toBe(pay2.paymentId);
    });

    it('transitions payment status to Paid and includes in profit totals', async () => {
      const pendingPayment = await repo.recordPayment({
        investorId: 'INV-00004',
        investmentId: 'INVEST-00005',
        paymentDate: '2026-09-02',
        paymentMonth: '2026-09',
        principalAmount: 0,
        profitAmount: 125000,
        otherAmount: 0,
        totalAmount: 125000,
        paymentMethod: 'Bank_Transfer',
        status: 'Pending'
      });

      // Update to Paid
      const updated = await repo.updatePaymentStatus(
        pendingPayment.paymentId,
        'Paid',
        'UTR-20260902-9988'
      );
      expect(updated.status).toBe('Paid');
      expect(updated.paymentReference).toBe('UTR-20260902-9988');

      // Check investor payments
      const details = await repo.getInvestorDetails('INV-00004');
      const profitPaid = calculateInvestorProfitPaid(details.payments);
      expect(profitPaid).toBeGreaterThanOrEqual(125000);
    });

    it('creates compensating negative record and audit trail on payment reversal', async () => {
      // Record a paid payment
      const payment = await repo.recordPayment({
        investorId: 'INV-00001',
        investmentId: 'INVEST-00001',
        paymentDate: '2026-09-01',
        paymentMonth: '2026-09',
        principalAmount: 0,
        profitAmount: 250000,
        otherAmount: 0,
        totalAmount: 250000,
        paymentMethod: 'Bank_Transfer',
        status: 'Paid'
      });

      // Reverse with mandatory justification
      const reversalReason = 'Incorrect beneficiary bank account IFSC';
      const reversed = await repo.reversePayment(payment.paymentId, reversalReason);

      expect(reversed.status).toBe('Reversed');
      expect(reversed.notes).toContain(reversalReason);

      // Verify compensating record exists in payments list
      const details = await repo.getInvestorDetails('INV-00001');
      const compensating = details.payments.find(p => p.paymentReference === `REV-${payment.paymentId}`);
      expect(compensating).toBeDefined();
      expect(compensating?.totalAmount).toBe(-250000);
      expect(compensating?.profitAmount).toBe(-250000);

      // Verify audit log has the event
      const auditLogs = await repo.getAuditLogs({ module: 'Finance' });
      const revLog = auditLogs.find(a => a.action === 'PAYMENT_REVERSED' && a.recordId === payment.paymentId);
      expect(revLog).toBeDefined();
      expect(revLog?.reason).toContain(reversalReason);
    });
  });

  describe('Bank Details & Data Privacy Masking', () => {
    it('masks bank account numbers and preserves primary designation', async () => {
      const rawAccount = '50100234564582';
      const masked = maskBankAccount(rawAccount);
      expect(masked).toBe('XXXX XXXX 4582');

      const bank = await repo.addBankDetails({
        investorId: 'INV-00001',
        accountHolderName: 'Rajesh Kumar Verma',
        bankName: 'Kotak Mahindra Bank',
        accountNumberMasked: masked,
        ifscCode: 'KKBK0001234',
        accountType: 'Savings',
        isPrimary: true
      });

      expect(bank.bankId).toMatch(/^BNK-\d{5}$/);
      expect(bank.accountNumberMasked).toBe('XXXX XXXX 4582');
      expect(bank.isPrimary).toBe(true);

      // Add a secondary bank account
      const secondaryBank = await repo.addBankDetails({
        investorId: 'INV-00001',
        accountHolderName: 'Rajesh Kumar Verma',
        bankName: 'ICICI Bank',
        accountNumberMasked: 'XXXX XXXX 9912',
        ifscCode: 'ICIC0000002',
        accountType: 'Current',
        isPrimary: false
      });

      const details = await repo.getInvestorDetails('INV-00001');
      expect(details.banks.length).toBeGreaterThanOrEqual(2);
      expect(details.bank?.bankName).toBe('Kotak Mahindra Bank');

      // Edit secondary bank to make it primary
      const updatedBank = await repo.updateBankDetails(secondaryBank.bankId, {
        isPrimary: true,
        bankName: 'ICICI Corporate Banking'
      });

      expect(updatedBank.isPrimary).toBe(true);
      expect(updatedBank.bankName).toBe('ICICI Corporate Banking');

      const refreshedDetails = await repo.getInvestorDetails('INV-00001');
      expect(refreshedDetails.bank?.bankId).toBe(secondaryBank.bankId);
    });
  });

  describe('Investor Profile Updates & Editing', () => {
    it('updates investor profile details and creates audit log', async () => {
      const investorId = 'INV-00001';
      const updated = await repo.updateInvestor(investorId, {
        name: 'Rajesh Kumar Verma (Updated)',
        email: 'rajesh.updated@example.com',
        status: 'Active',
        notes: 'HNI Account - Tier 1 VIP'
      });

      expect(updated.name).toBe('Rajesh Kumar Verma (Updated)');
      expect(updated.email).toBe('rajesh.updated@example.com');
      expect(updated.notes).toBe('HNI Account - Tier 1 VIP');

      const details = await repo.getInvestorDetails(investorId);
      expect(details.investor.name).toBe('Rajesh Kumar Verma (Updated)');

      // Verify audit log
      const auditLogs = await repo.getAuditLogs({ module: 'Investors' });
      const editLog = auditLogs.find(a => a.action === 'INVESTOR_UPDATED' && a.recordId === investorId);
      expect(editLog).toBeDefined();
    });

    it('updates an investment tranche and recalculates monthly return automatically', async () => {
      const investmentId = 'INVEST-00001'; // Initially 1.00 Cr @ 2.5% = 2,50,000

      const updated = await repo.updateInvestment(investmentId, {
        principalAmount: 12000000, // 1.20 Cr
        returnPercentage: 3.0 // 3.0%
      });

      expect(updated.principalAmount).toBe(12000000);
      expect(updated.returnPercentage).toBe(3.0);
      expect(updated.monthlyReturn).toBe(360000); // 1.20 Cr * 3.0% = 3,60,000

      // Verify audit log
      const auditLogs = await repo.getAuditLogs({ module: 'Investors' });
      const trancheLog = auditLogs.find(a => a.action === 'INVESTMENT_UPDATED' && a.recordId === investmentId);
      expect(trancheLog).toBeDefined();
    });

    it('attaches and updates investor documents and KYC files', async () => {
      const investorId = 'INV-00001';
      const newDoc = await repo.addInvestorDocument({
        entityType: 'Investor',
        entityId: investorId,
        documentName: 'Master Investment Agreement 2026',
        documentType: 'Agreement',
        driveUrl: 'https://drive.google.com/file/d/sample-agreement',
        uploadedDate: '2026-09-02',
        expiryDate: '2028-09-02',
        status: 'Valid',
        createdBy: 'USR-00001'
      });

      expect(newDoc.documentId).toMatch(/^DOC-\d{5}$/);
      expect(newDoc.documentName).toBe('Master Investment Agreement 2026');

      // Update document
      const updatedDoc = await repo.updateInvestorDocument(newDoc.documentId, {
        documentName: 'Master Investment Agreement 2026 (Executed & Notarized)',
        status: 'Valid'
      });

      expect(updatedDoc.documentName).toBe('Master Investment Agreement 2026 (Executed & Notarized)');

      // Verify audit log
      const auditLogs = await repo.getAuditLogs({ module: 'Investors' });
      const docLog = auditLogs.find(a => a.action === 'DOCUMENT_UPDATED' && a.recordId === newDoc.documentId);
      expect(docLog).toBeDefined();
    });
  });
});
