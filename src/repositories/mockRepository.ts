/**
 * Mock / Offline Development Repository
 *
 * Implements all repository interfaces with seed data, financial invariants, and audit logging.
 * Enables full application usability even without live Google Sheets access.
 */

import {
  IAuthRepository,
  IInvestorRepository,
  ITradeRepository,
  IStaffRepository,
  IFinanceRepository,
  IAuditRepository
} from './interfaces';

import {
  User,
  Investor,
  InvestorBank,
  Investment,
  InvestorPayment,
  InvestorDocument,
  Staff,
  Trade,
  StaffCommission,
  Expense,
  Salary,
  AuditLog,
  DashboardSummary
} from '../types';

import {
  calculateTradePnL,
  calculateStaffShare,
  calculateCompanyShare,
  calculateROI,
  calculateNetSalary,
  calculateCompanyNetProfit
} from '../utils/calculations';

export class MockRepository
  implements
    IAuthRepository,
    IInvestorRepository,
    ITradeRepository,
    IStaffRepository,
    IFinanceRepository,
    IAuditRepository
{
  private currentUser: User | null = null;
  private idempotencyCache = new Map<string, any>();

  // --- Seed Data ---
  private users: User[] = [
    { userId: 'USR-00001', username: 'admin', fullName: 'Super Admin', email: 'admin@assetmgmt.internal', role: 'Admin', status: 'Active' },
    { userId: 'USR-00002', username: 'manager', fullName: 'Operations Manager', email: 'manager@assetmgmt.internal', role: 'Manager', staffId: 'STAFF-00001', status: 'Active' },
    { userId: 'USR-00003', username: 'trader1', fullName: 'Vikram Sharma', email: 'vikram@assetmgmt.internal', role: 'Staff', staffId: 'STAFF-00002', status: 'Active' }
  ];

  private staff: Staff[] = [
    { staffId: 'STAFF-00001', name: 'Operations Manager', phone: '+91 98765 43210', email: 'manager@assetmgmt.internal', role: 'Manager', department: 'Operations', joiningDate: '2024-01-15', basicSalary: 150000, tradingPercentage: 0, commissionPercentage: 5, status: 'Active', bankDetailsReference: 'BNK-S01', notes: 'Head of Operations', createdAt: '2024-01-15T10:00:00.000Z', updatedAt: '2024-01-15T10:00:00.000Z' },
    { staffId: 'STAFF-00002', name: 'Vikram Sharma', phone: '+91 98111 22334', email: 'vikram@assetmgmt.internal', role: 'Trader', department: 'Prop Trading', joiningDate: '2024-03-01', basicSalary: 80000, tradingPercentage: 20, commissionPercentage: 0, status: 'Active', bankDetailsReference: 'BNK-S02', notes: 'Index Derivatives Trader', createdAt: '2024-03-01T10:00:00.000Z', updatedAt: '2024-03-01T10:00:00.000Z' },
    { staffId: 'STAFF-00003', name: 'Priya Patel', phone: '+91 98222 33445', email: 'priya@assetmgmt.internal', role: 'Trader', department: 'Prop Trading', joiningDate: '2024-06-01', basicSalary: 80000, tradingPercentage: 20, commissionPercentage: 0, status: 'Active', bankDetailsReference: 'BNK-S03', notes: 'Options Specialist', createdAt: '2024-06-01T10:00:00.000Z', updatedAt: '2024-06-01T10:00:00.000Z' }
  ];

  private investors: Investor[] = [
    { investorId: 'INV-00001', name: 'Rajesh Kumar', phone: '+91 98333 44556', email: 'rajesh.kumar@example.com', address: 'Bandra West, Mumbai', joiningDate: '2025-01-10', status: 'Active', notes: 'HNI Investor', createdAt: '2025-01-10T10:00:00.000Z', updatedAt: '2025-01-10T10:00:00.000Z' },
    { investorId: 'INV-00002', name: 'Ananya Singhania', phone: '+91 98444 55667', email: 'ananya.s@example.com', address: 'Vasant Vihar, New Delhi', joiningDate: '2025-02-15', status: 'Active', notes: 'Family Office', createdAt: '2025-02-15T10:00:00.000Z', updatedAt: '2025-02-15T10:00:00.000Z' },
    { investorId: 'INV-00003', name: 'Suresh Rao', phone: '+91 98555 66778', email: 'suresh.rao@example.com', address: 'Indiranagar, Bengaluru', joiningDate: '2025-03-20', status: 'Active', notes: 'Corporate Executive', createdAt: '2025-03-20T10:00:00.000Z', updatedAt: '2025-03-20T10:00:00.000Z' },
    { investorId: 'INV-00004', name: 'Kavita Menon', phone: '+91 98666 77889', email: 'kavita.m@example.com', address: 'Alwarpet, Chennai', joiningDate: '2025-05-01', status: 'Active', notes: 'Real estate investor', createdAt: '2025-05-01T10:00:00.000Z', updatedAt: '2025-05-01T10:00:00.000Z' },
    { investorId: 'INV-00005', name: 'Amit Shah', phone: '+91 98777 88990', email: 'amit.shah@example.com', address: 'Bodakdev, Ahmedabad', joiningDate: '2025-07-10', status: 'Active', notes: 'Textile Entrepreneur', createdAt: '2025-07-10T10:00:00.000Z', updatedAt: '2025-07-10T10:00:00.000Z' }
  ];

  private banks: InvestorBank[] = [
    { bankId: 'BNK-00001', investorId: 'INV-00001', accountHolderName: 'Rajesh Kumar', bankName: 'HDFC Bank', accountNumberMasked: 'XXXX XXXX 4582', ifscCode: 'HDFC0000123', accountType: 'Savings', isPrimary: true, createdAt: '2025-01-10T10:00:00.000Z' },
    { bankId: 'BNK-00002', investorId: 'INV-00002', accountHolderName: 'Ananya Singhania', bankName: 'ICICI Bank', accountNumberMasked: 'XXXX XXXX 9912', ifscCode: 'ICIC0000456', accountType: 'Current', isPrimary: true, createdAt: '2025-02-15T10:00:00.000Z' },
    { bankId: 'BNK-00003', investorId: 'INV-00003', accountHolderName: 'Suresh Rao', bankName: 'Axis Bank', accountNumberMasked: 'XXXX XXXX 3341', ifscCode: 'UTIB0000789', accountType: 'Savings', isPrimary: true, createdAt: '2025-03-20T10:00:00.000Z' },
    { bankId: 'BNK-00004', investorId: 'INV-00004', accountHolderName: 'Kavita Menon', bankName: 'Kotak Mahindra Bank', accountNumberMasked: 'XXXX XXXX 7720', ifscCode: 'KKBK0000101', accountType: 'Savings', isPrimary: true, createdAt: '2025-05-01T10:00:00.000Z' },
    { bankId: 'BNK-00005', investorId: 'INV-00005', accountHolderName: 'Amit Shah', bankName: 'State Bank of India', accountNumberMasked: 'XXXX XXXX 6114', ifscCode: 'SBIN0000202', accountType: 'Current', isPrimary: true, createdAt: '2025-07-10T10:00:00.000Z' }
  ];

  private investments: Investment[] = [
    { investmentId: 'INVEST-00001', investorId: 'INV-00001', principalAmount: 10000000, investmentDate: '2025-01-15', maturityDate: '2027-01-15', returnPercentage: 2.5, monthlyReturn: 250000, paymentFrequency: 'Monthly', policyId: 'POL-00001', status: 'Active', notes: 'Tranche A', createdAt: '2025-01-15T10:00:00.000Z', updatedAt: '2025-01-15T10:00:00.000Z', createdBy: 'USR-00001' },
    { investmentId: 'INVEST-00002', investorId: 'INV-00001', principalAmount: 5000000, investmentDate: '2025-06-01', maturityDate: '2027-06-01', returnPercentage: 2.5, monthlyReturn: 125000, paymentFrequency: 'Monthly', policyId: 'POL-00001', status: 'Active', notes: 'Tranche B', createdAt: '2025-06-01T10:00:00.000Z', updatedAt: '2025-06-01T10:00:00.000Z', createdBy: 'USR-00001' },
    { investmentId: 'INVEST-00003', investorId: 'INV-00002', principalAmount: 20000000, investmentDate: '2025-02-20', maturityDate: '2027-02-20', returnPercentage: 2.2, monthlyReturn: 440000, paymentFrequency: 'Monthly', policyId: 'POL-00001', status: 'Active', notes: 'Primary allocation', createdAt: '2025-02-20T10:00:00.000Z', updatedAt: '2025-02-20T10:00:00.000Z', createdBy: 'USR-00001' },
    { investmentId: 'INVEST-00004', investorId: 'INV-00003', principalAmount: 7500000, investmentDate: '2025-03-25', maturityDate: '2026-03-25', returnPercentage: 2.5, monthlyReturn: 187500, paymentFrequency: 'Monthly', policyId: 'POL-00001', status: 'Active', notes: '1 Year Lock-in', createdAt: '2025-03-25T10:00:00.000Z', updatedAt: '2025-03-25T10:00:00.000Z', createdBy: 'USR-00001' },
    { investmentId: 'INVEST-00005', investorId: 'INV-00004', principalAmount: 5000000, investmentDate: '2025-05-10', maturityDate: '2026-05-10', returnPercentage: 2.5, monthlyReturn: 125000, paymentFrequency: 'Monthly', policyId: 'POL-00001', status: 'Active', notes: 'Tranche 1', createdAt: '2025-05-10T10:00:00.000Z', updatedAt: '2025-05-10T10:00:00.000Z', createdBy: 'USR-00001' },
    { investmentId: 'INVEST-00006', investorId: 'INV-00005', principalAmount: 15000000, investmentDate: '2025-07-15', maturityDate: '2027-07-15', returnPercentage: 2.3, monthlyReturn: 345000, paymentFrequency: 'Monthly', policyId: 'POL-00001', status: 'Active', notes: 'Tranche A', createdAt: '2025-07-15T10:00:00.000Z', updatedAt: '2025-07-15T10:00:00.000Z', createdBy: 'USR-00001' }
  ];

  private payments: InvestorPayment[] = [
    { paymentId: 'PAY-00001', investorId: 'INV-00001', investmentId: 'INVEST-00001', paymentDate: '2026-08-05', paymentMonth: '2026-08', principalAmount: 0, profitAmount: 250000, otherAmount: 0, totalAmount: 250000, paymentMethod: 'Bank_Transfer', paymentReference: 'UTR202608051234', status: 'Paid', createdAt: '2026-08-05T10:00:00.000Z', createdBy: 'USR-00001' },
    { paymentId: 'PAY-00002', investorId: 'INV-00001', investmentId: 'INVEST-00002', paymentDate: '2026-08-05', paymentMonth: '2026-08', principalAmount: 0, profitAmount: 125000, otherAmount: 0, totalAmount: 125000, paymentMethod: 'Bank_Transfer', paymentReference: 'UTR202608051235', status: 'Paid', createdAt: '2026-08-05T10:00:00.000Z', createdBy: 'USR-00001' },
    { paymentId: 'PAY-00003', investorId: 'INV-00002', investmentId: 'INVEST-00003', paymentDate: '2026-08-05', paymentMonth: '2026-08', principalAmount: 0, profitAmount: 440000, otherAmount: 0, totalAmount: 440000, paymentMethod: 'Bank_Transfer', paymentReference: 'UTR202608051236', status: 'Paid', createdAt: '2026-08-05T10:00:00.000Z', createdBy: 'USR-00001' },
    { paymentId: 'PAY-00004', investorId: 'INV-00003', investmentId: 'INVEST-00004', paymentDate: '2026-08-05', paymentMonth: '2026-08', principalAmount: 0, profitAmount: 187500, otherAmount: 0, totalAmount: 187500, paymentMethod: 'Bank_Transfer', paymentReference: 'UTR202608051237', status: 'Paid', createdAt: '2026-08-05T10:00:00.000Z', createdBy: 'USR-00001' },
    { paymentId: 'PAY-00005', investorId: 'INV-00001', investmentId: 'INVEST-00001', paymentDate: '2026-09-05', paymentMonth: '2026-09', principalAmount: 0, profitAmount: 250000, otherAmount: 0, totalAmount: 250000, paymentMethod: 'Bank_Transfer', status: 'Pending', createdAt: '2026-09-01T10:00:00.000Z', createdBy: 'USR-00001' }
  ];

  private trades: Trade[] = [
    { tradeId: 'TRD-00001', staffId: 'STAFF-00002', tradeDate: '2026-09-01', asset: 'BANKNIFTY_FUT', tradeType: 'INTRADAY', capitalUsed: 2500000, entryPrice: 51200, exitPrice: 51650, quantity: 300, grossProfit: 135000, grossLoss: 0, netPnL: 135000, appliedPercentage: 20, staffShare: 27000, companyShare: 108000, roiPercentage: 5.4, status: 'Settled', notes: 'Morning breakout', createdAt: '2026-09-01T15:30:00.000Z', createdBy: 'USR-00003' },
    { tradeId: 'TRD-00002', staffId: 'STAFF-00002', tradeDate: '2026-09-02', asset: 'NIFTY_24500_PE', tradeType: 'OPTION', capitalUsed: 1500000, entryPrice: 120, exitPrice: 45, quantity: 1200, grossProfit: 90000, grossLoss: 0, netPnL: 90000, appliedPercentage: 20, staffShare: 18000, companyShare: 72000, roiPercentage: 6.0, status: 'Settled', notes: 'Expiry theta decay', createdAt: '2026-09-02T15:30:00.000Z', createdBy: 'USR-00003' },
    { tradeId: 'TRD-00003', staffId: 'STAFF-00003', tradeDate: '2026-09-02', asset: 'RELIANCE_EQ', tradeType: 'SWING', capitalUsed: 3000000, entryPrice: 2980, exitPrice: 2950, quantity: 1000, grossProfit: 0, grossLoss: 30000, netPnL: -30000, appliedPercentage: 20, staffShare: 0, companyShare: -30000, roiPercentage: -1.0, status: 'Settled', notes: 'Stop loss hit', createdAt: '2026-09-02T15:30:00.000Z', createdBy: 'USR-00001' }
  ];

  private commissions: StaffCommission[] = [
    { commissionId: 'COMM-00001', staffId: 'STAFF-00002', tradeId: 'TRD-00001', commissionPeriod: '2026-09', baseAmount: 135000, appliedPercentage: 20, commissionAmount: 27000, status: 'Calculated', createdAt: '2026-09-01T16:00:00.000Z' },
    { commissionId: 'COMM-00002', staffId: 'STAFF-00002', tradeId: 'TRD-00002', commissionPeriod: '2026-09', baseAmount: 90000, appliedPercentage: 20, commissionAmount: 18000, status: 'Calculated', createdAt: '2026-09-02T16:00:00.000Z' }
  ];

  private expenses: Expense[] = [
    { expenseId: 'EXP-00001', expenseDate: '2026-09-01', category: 'Rent', description: 'Trading Desk Office Lease - Mumbai', amount: 180000, paymentMethod: 'Bank_Transfer', vendor: 'DLF Estates', status: 'Paid', createdAt: '2026-09-01T10:00:00.000Z', createdBy: 'USR-00001', approvedAt: '2026-09-01T11:00:00.000Z', approvedBy: 'USR-00001' },
    { expenseId: 'EXP-00002', expenseDate: '2026-09-02', category: 'Software', description: 'Bloomberg & TradingView Pro Terminal Subscriptions', amount: 95000, paymentMethod: 'Credit_Card', vendor: 'TradingView & Terminals Inc', status: 'Paid', createdAt: '2026-09-02T10:00:00.000Z', createdBy: 'USR-00001', approvedAt: '2026-09-02T11:00:00.000Z', approvedBy: 'USR-00001' },
    { expenseId: 'EXP-00003', expenseDate: '2026-09-02', category: 'Office_Supplies', description: 'Desk ergonomic setups and displays', amount: 35000, paymentMethod: 'UPI', vendor: 'Modern Tech Store', status: 'Submitted', createdAt: '2026-09-02T12:00:00.000Z', createdBy: 'USR-00002' }
  ];

  private salaries: Salary[] = [
    { salaryId: 'SAL-00001', staffId: 'STAFF-00001', salaryMonth: '2026-08', basicSalary: 150000, allowance: 25000, bonus: 20000, commission: 0, deduction: 15000, advance: 0, netSalary: 180000, paymentDate: '2026-08-31', paymentStatus: 'Paid', paymentReference: 'SAL-AUG-01', createdAt: '2026-08-30T10:00:00.000Z', createdBy: 'USR-00001', approvedAt: '2026-08-31T09:00:00.000Z', approvedBy: 'USR-00001' },
    { salaryId: 'SAL-00002', staffId: 'STAFF-00002', salaryMonth: '2026-08', basicSalary: 80000, allowance: 10000, bonus: 0, commission: 45000, deduction: 8000, advance: 0, netSalary: 127000, paymentDate: '2026-08-31', paymentStatus: 'Paid', paymentReference: 'SAL-AUG-02', createdAt: '2026-08-30T10:00:00.000Z', createdBy: 'USR-00001', approvedAt: '2026-08-31T09:00:00.000Z', approvedBy: 'USR-00001' },
    { salaryId: 'SAL-00003', staffId: 'STAFF-00003', salaryMonth: '2026-08', basicSalary: 80000, allowance: 10000, bonus: 0, commission: 30000, deduction: 8000, advance: 0, netSalary: 112000, paymentDate: '2026-08-31', paymentStatus: 'Paid', paymentReference: 'SAL-AUG-03', createdAt: '2026-08-30T10:00:00.000Z', createdBy: 'USR-00001', approvedAt: '2026-08-31T09:00:00.000Z', approvedBy: 'USR-00001' }
  ];

  private auditLogs: AuditLog[] = [
    { auditId: 'AUD-00001', timestamp: '2026-09-01T10:00:00.000Z', userId: 'USR-00001', action: 'SYSTEM_INITIALIZED', module: 'System', recordId: 'SYS-INIT', reason: 'Database setup completed' },
    { auditId: 'AUD-00002', timestamp: '2026-09-01T15:30:00.000Z', userId: 'USR-00003', action: 'TRADE_CREATED', module: 'Trading', recordId: 'TRD-00001', reason: 'BANKNIFTY long executed' }
  ];

  private documents: InvestorDocument[] = [
    { documentId: 'DOC-00001', entityType: 'Investor', entityId: 'INV-00001', documentType: 'Agreement', documentName: 'Investment Agreement - Tranche A (Signed)', driveUrl: 'https://drive.google.com/file/d/sample1', uploadedDate: '2025-01-15', status: 'Valid' },
    { documentId: 'DOC-00002', entityType: 'Investor', entityId: 'INV-00001', documentType: 'KYC', documentName: 'Aadhaar & PAN Verification Card', driveUrl: 'https://drive.google.com/file/d/sample2', uploadedDate: '2025-01-10', status: 'Valid' },
    { documentId: 'DOC-00003', entityType: 'Investor', entityId: 'INV-00002', documentType: 'Agreement', documentName: 'Family Office Master Mandate', driveUrl: 'https://drive.google.com/file/d/sample3', uploadedDate: '2025-02-20', status: 'Valid' }
  ];

  // --- Auth Methods ---
  async login(username: string, _password: string): Promise<{ token: string; user: User }> {
    const user = this.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      throw new Error('Invalid credentials');
    }
    this.currentUser = user;
    await this.logEvent('USER_LOGIN', 'Auth', user.userId, null, { username: user.username, role: user.role }, 'User logged in');
    return { token: 'mock_tok_' + user.userId, user };
  }

  async getCurrentUser(): Promise<User | null> {
    return this.currentUser || this.users[0]; // Defaults to Super Admin in mock mode if unauthenticated
  }

  async logout(): Promise<void> {
    if (this.currentUser) {
      await this.logEvent('USER_LOGOUT', 'Auth', this.currentUser.userId, null, null, 'User logged out');
    }
    this.currentUser = null;
  }

  // --- Investor Methods ---
  async getInvestors(filters?: { status?: string; search?: string }): Promise<Investor[]> {
    let list = [...this.investors];
    if (filters?.status && filters.status !== 'All') {
      list = list.filter(i => i.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.investorId.toLowerCase().includes(q) ||
          i.phone.includes(q)
      );
    }
    return list;
  }

  async getInvestorDetails(investorId: string) {
    const investor = this.investors.find(i => i.investorId === investorId);
    if (!investor) throw new Error(`Investor ${investorId} not found`);
    const bank = this.banks.find(b => b.investorId === investorId);
    const tranches = this.investments.filter(i => i.investorId === investorId);
    const invPayments = this.payments.filter(p => p.investorId === investorId);
    const invDocs = this.documents.filter(d => d.entityId === investorId);
    return { investor, bank, investments: tranches, payments: invPayments, documents: invDocs };
  }

  async createInvestor(data: Omit<Investor, 'investorId' | 'createdAt' | 'updatedAt'>): Promise<Investor> {
    const seq = this.investors.length + 1;
    const newId = `INV-${('00000' + seq).slice(-5)}`;
    const now = new Date().toISOString();
    const newInvestor: Investor = {
      ...data,
      investorId: newId,
      createdAt: now,
      updatedAt: now
    };
    this.investors.push(newInvestor);
    await this.logEvent('INVESTOR_CREATED', 'Investors', newId, null, newInvestor, 'Created investor');
    return newInvestor;
  }

  async updateInvestor(investorId: string, fields: Partial<Investor>): Promise<Investor> {
    const idx = this.investors.findIndex(i => i.investorId === investorId);
    if (idx === -1) throw new Error('Investor not found');
    const oldVal = { ...this.investors[idx] };
    this.investors[idx] = {
      ...this.investors[idx],
      ...fields,
      updatedAt: new Date().toISOString()
    };
    await this.logEvent('INVESTOR_UPDATED', 'Investors', investorId, oldVal, this.investors[idx], 'Updated profile');
    return this.investors[idx];
  }

  async createInvestment(data: Omit<Investment, 'investmentId' | 'createdAt' | 'updatedAt'>): Promise<Investment> {
    const seq = this.investments.length + 1;
    const newId = `INVEST-${('00000' + seq).slice(-5)}`;
    const now = new Date().toISOString();
    const newInvestment: Investment = {
      ...data,
      investmentId: newId,
      createdAt: now,
      updatedAt: now
    };
    this.investments.push(newInvestment);
    await this.logEvent('INVESTMENT_CREATED', 'Investors', newId, null, newInvestment, 'Added investment tranche');
    return newInvestment;
  }

  async recordPayment(data: Omit<InvestorPayment, 'paymentId' | 'createdAt'>, requestId?: string): Promise<InvestorPayment> {
    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId);
    }
    const seq = this.payments.length + 1;
    const newId = `PAY-${('00000' + seq).slice(-5)}`;
    const newPayment: InvestorPayment = {
      ...data,
      paymentId: newId,
      createdAt: new Date().toISOString()
    };
    this.payments.unshift(newPayment);
    if (requestId) this.idempotencyCache.set(requestId, newPayment);
    await this.logEvent('PAYMENT_RECORDED', 'Finance', newId, null, newPayment, `Payment recorded for ${data.paymentMonth}`);
    return newPayment;
  }

  async updatePaymentStatus(paymentId: string, status: InvestorPayment['status'], paymentReference?: string, requestId?: string): Promise<InvestorPayment> {
    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId);
    }
    const idx = this.payments.findIndex(p => p.paymentId === paymentId);
    if (idx === -1) throw new Error(`Payment ${paymentId} not found`);

    const oldVal = { ...this.payments[idx] };
    this.payments[idx].status = status;
    if (paymentReference) {
      this.payments[idx].paymentReference = paymentReference;
    }

    if (requestId) this.idempotencyCache.set(requestId, this.payments[idx]);
    await this.logEvent('PAYMENT_STATUS_UPDATED', 'Finance', paymentId, oldVal, this.payments[idx], `Status transitioned to ${status}`);
    return this.payments[idx];
  }

  async reversePayment(paymentId: string, reason: string, requestId?: string): Promise<InvestorPayment> {
    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId);
    }
    const idx = this.payments.findIndex(p => p.paymentId === paymentId);
    if (idx === -1) throw new Error(`Payment ${paymentId} not found`);
    const origPayment = this.payments[idx];

    // Mark original as Reversed
    const oldVal = { ...origPayment };
    origPayment.status = 'Reversed';
    origPayment.notes = (origPayment.notes ? origPayment.notes + ' | ' : '') + `Reversed: ${reason}`;

    // Create compensating reversal record
    const seq = this.payments.length + 1;
    const revId = `PAY-${('00000' + seq).slice(-5)}`;
    const compensatingRecord: InvestorPayment = {
      paymentId: revId,
      investorId: origPayment.investorId,
      investmentId: origPayment.investmentId,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMonth: origPayment.paymentMonth,
      principalAmount: -origPayment.principalAmount,
      profitAmount: -origPayment.profitAmount,
      otherAmount: -origPayment.otherAmount,
      totalAmount: -origPayment.totalAmount,
      paymentMethod: origPayment.paymentMethod,
      paymentReference: `REV-${origPayment.paymentId}`,
      status: 'Reversed',
      notes: `Compensating reversal for ${origPayment.paymentId}: ${reason}`,
      createdAt: new Date().toISOString()
    };
    this.payments.unshift(compensatingRecord);

    if (requestId) this.idempotencyCache.set(requestId, origPayment);
    await this.logEvent('PAYMENT_REVERSED', 'Finance', paymentId, oldVal, origPayment, `Reversal reason: ${reason}`);
    return origPayment;
  }

  async addBankDetails(data: Omit<InvestorBank, 'bankId' | 'createdAt'>): Promise<InvestorBank> {
    const seq = this.banks.length + 1;
    const newId = `BNK-${('00000' + seq).slice(-5)}`;
    const newBank: InvestorBank = {
      ...data,
      bankId: newId,
      createdAt: new Date().toISOString()
    };
    if (data.isPrimary) {
      this.banks.forEach(b => {
        if (b.investorId === data.investorId) b.isPrimary = false;
      });
    }
    this.banks.push(newBank);
    await this.logEvent('BANK_DETAILS_ADDED', 'Investors', newId, null, newBank, `Bank details added for ${data.investorId}`);
    return newBank;
  }

  async getInvestorDocuments(investorId: string): Promise<InvestorDocument[]> {
    return this.documents.filter(d => d.entityId === investorId);
  }

  // --- Trade Methods ---
  async getTrades(filters?: { staffId?: string; status?: string; asset?: string }): Promise<Trade[]> {
    let list = [...this.trades];
    if (filters?.staffId) {
      list = list.filter(t => t.staffId === filters.staffId);
    }
    if (filters?.status && filters.status !== 'All') {
      list = list.filter(t => t.status === filters.status);
    }
    if (filters?.asset) {
      const q = filters.asset.toLowerCase();
      list = list.filter(t => t.asset.toLowerCase().includes(q));
    }
    return list;
  }

  async getTradeDetails(tradeId: string): Promise<Trade | null> {
    return this.trades.find(t => t.tradeId === tradeId) || null;
  }

  async createTrade(
    data: Omit<Trade, 'tradeId' | 'createdAt' | 'netPnL' | 'staffShare' | 'companyShare' | 'roiPercentage' | 'appliedPercentage'>,
    requestId?: string
  ): Promise<Trade> {
    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId);
    }

    const netPnL = calculateTradePnL(data.grossProfit, data.grossLoss);
    const staffMember = this.staff.find(s => s.staffId === data.staffId);
    // Lock historical applied percentage
    const appliedPct = staffMember ? staffMember.tradingPercentage : 20;
    const staffShare = calculateStaffShare(netPnL, appliedPct);
    const companyShare = calculateCompanyShare(netPnL, staffShare);
    const roiPercentage = calculateROI(netPnL, data.capitalUsed);

    const seq = this.trades.length + 1;
    const newId = `TRD-${('00000' + seq).slice(-5)}`;
    const newTrade: Trade = {
      ...data,
      tradeId: newId,
      netPnL,
      appliedPercentage: appliedPct,
      staffShare,
      companyShare,
      roiPercentage,
      createdAt: new Date().toISOString()
    };

    this.trades.unshift(newTrade);
    if (requestId) this.idempotencyCache.set(requestId, newTrade);
    await this.logEvent('TRADE_CREATED', 'Trading', newId, null, newTrade, `Trade recorded on ${data.asset}`);
    return newTrade;
  }

  async updateTradeStatus(tradeId: string, status: Trade['status'], notes?: string): Promise<Trade> {
    const idx = this.trades.findIndex(t => t.tradeId === tradeId);
    if (idx === -1) throw new Error('Trade not found');
    const oldVal = { ...this.trades[idx] };
    this.trades[idx].status = status;
    if (notes) this.trades[idx].notes = notes;
    await this.logEvent('TRADE_STATUS_UPDATED', 'Trading', tradeId, oldVal, this.trades[idx], `Status changed to ${status}`);
    return this.trades[idx];
  }

  async settleTrade(tradeId: string, requestId?: string): Promise<{ trade: Trade; commission?: StaffCommission }> {
    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId);
    }

    const trade = await this.updateTradeStatus(tradeId, 'Settled');
    let commission: StaffCommission | undefined = undefined;

    // Automatically generate commission record if trader earned profit cut
    if (trade.staffShare > 0) {
      const month = trade.tradeDate.slice(0, 7);
      commission = await this.calculateAndCreateCommission({
        staffId: trade.staffId,
        tradeId: trade.tradeId,
        commissionPeriod: month,
        baseAmount: trade.netPnL,
        appliedPercentage: trade.appliedPercentage,
        commissionAmount: trade.staffShare,
        status: 'Calculated',
        notes: `Commission for ${trade.asset} (${trade.tradeId})`
      });
    }

    const result = { trade, commission };
    if (requestId) this.idempotencyCache.set(requestId, result);
    return result;
  }

  // --- Staff Methods ---
  async getStaffList(): Promise<Staff[]> {
    return [...this.staff];
  }

  async getStaffById(staffId: string): Promise<Staff | null> {
    return this.staff.find(s => s.staffId === staffId) || null;
  }

  async getStaffDetails(staffId: string) {
    const member = this.staff.find(s => s.staffId === staffId);
    if (!member) throw new Error(`Staff member ${staffId} not found`);

    const staffTrades = this.trades.filter(t => t.staffId === staffId);
    const staffCommissions = this.commissions.filter(c => c.staffId === staffId);

    let totalNetPnL = 0;
    let totalStaffShare = 0;
    let totalCompanyShare = 0;
    let winningTrades = 0;

    staffTrades.forEach(t => {
      totalNetPnL += t.netPnL;
      totalStaffShare += t.staffShare;
      totalCompanyShare += t.companyShare;
      if (t.netPnL > 0) winningTrades++;
    });

    const winRate = staffTrades.length > 0 ? (winningTrades / staffTrades.length) * 100 : 0;

    return {
      staff: member,
      trades: staffTrades,
      commissions: staffCommissions,
      metrics: {
        totalTrades: staffTrades.length,
        winningTrades,
        winRate,
        totalNetPnL,
        totalStaffShare,
        totalCompanyShare
      }
    };
  }

  async createStaff(data: Omit<Staff, 'staffId' | 'createdAt' | 'updatedAt'>): Promise<Staff> {
    const seq = this.staff.length + 1;
    const newId = `STAFF-${('00000' + seq).slice(-5)}`;
    const now = new Date().toISOString();
    const newStaff: Staff = {
      ...data,
      staffId: newId,
      createdAt: now,
      updatedAt: now
    };
    this.staff.push(newStaff);
    await this.logEvent('STAFF_CREATED', 'Staff', newId, null, newStaff, 'Added staff profile');
    return newStaff;
  }

  async updateStaff(staffId: string, fields: Partial<Staff>): Promise<Staff> {
    const idx = this.staff.findIndex(s => s.staffId === staffId);
    if (idx === -1) throw new Error('Staff not found');
    const oldVal = { ...this.staff[idx] };
    this.staff[idx] = {
      ...this.staff[idx],
      ...fields,
      updatedAt: new Date().toISOString()
    };
    await this.logEvent('STAFF_UPDATED', 'Staff', staffId, oldVal, this.staff[idx], 'Updated staff details');
    return this.staff[idx];
  }

  async getCommissions(filters?: { staffId?: string; period?: string }): Promise<StaffCommission[]> {
    let list = [...this.commissions];
    if (filters?.staffId) {
      list = list.filter(c => c.staffId === filters.staffId);
    }
    if (filters?.period) {
      list = list.filter(c => c.commissionPeriod === filters.period);
    }
    return list;
  }

  async calculateAndCreateCommission(
    data: Omit<StaffCommission, 'commissionId' | 'createdAt'>,
    requestId?: string
  ): Promise<StaffCommission> {
    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId);
    }
    const seq = this.commissions.length + 1;
    const newId = `COMM-${('00000' + seq).slice(-5)}`;
    const newComm: StaffCommission = {
      ...data,
      commissionId: newId,
      createdAt: new Date().toISOString()
    };
    this.commissions.unshift(newComm);
    if (requestId) this.idempotencyCache.set(requestId, newComm);
    await this.logEvent('COMMISSION_CREATED', 'Trading', newId, null, newComm, `Commission created for ${data.staffId}`);
    return newComm;
  }

  async updateCommissionStatus(commissionId: string, status: StaffCommission['status']): Promise<StaffCommission> {
    const idx = this.commissions.findIndex(c => c.commissionId === commissionId);
    if (idx === -1) throw new Error('Commission not found');
    const oldVal = { ...this.commissions[idx] };
    this.commissions[idx].status = status;
    if (status === 'Approved') {
      this.commissions[idx].approvedAt = new Date().toISOString();
    } else if (status === 'Paid') {
      this.commissions[idx].paidAt = new Date().toISOString();
    }
    await this.logEvent('COMMISSION_STATUS_UPDATED', 'Trading', commissionId, oldVal, this.commissions[idx], `Commission status changed to ${status}`);
    return this.commissions[idx];
  }

  // --- Finance Methods ---
  async getDashboardSummary(period?: string): Promise<DashboardSummary> {
    let totalPrincipal = 0;
    let totalMonthlyReturnExpected = 0;
    this.investments.forEach(inv => {
      if (inv.status === 'Active') {
        totalPrincipal += inv.principalAmount;
        totalMonthlyReturnExpected += inv.monthlyReturn;
      }
    });

    let tradingPnL = 0;
    let winningTrades = 0;
    this.trades.forEach(t => {
      tradingPnL += t.netPnL;
      if (t.netPnL > 0) winningTrades++;
    });

    const winRate = this.trades.length > 0 ? (winningTrades / this.trades.length) * 100 : 0;

    let expensesMonth = 0;
    this.expenses.forEach(e => {
      if (e.status === 'Paid' || e.status === 'Approved') {
        expensesMonth += e.amount;
      }
    });

    let salariesMonth = 0;
    this.salaries.forEach(s => {
      if (s.paymentStatus === 'Paid' || s.paymentStatus === 'Approved') {
        salariesMonth += s.netSalary;
      }
    });

    const netCompanyProfit = calculateCompanyNetProfit(
      tradingPnL,
      0,
      totalMonthlyReturnExpected,
      0,
      expensesMonth,
      salariesMonth,
      0
    );

    return {
      period: period || '2026-09',
      capital: {
        total: totalPrincipal,
        deployed: totalPrincipal * 0.65,
        available: totalPrincipal * 0.35,
        utilizationPercentage: 65.0
      },
      investors: {
        activeCount: this.investors.filter(i => i.status === 'Active').length,
        totalPrincipal,
        profitPaidMonth: totalMonthlyReturnExpected,
        pendingPaymentsCount: this.payments.filter(p => p.status === 'Pending').length
      },
      trading: {
        monthlyPnL: tradingPnL,
        totalTrades: this.trades.length,
        winningTrades,
        winRate
      },
      finance: {
        expensesMonth,
        salariesMonth,
        netCompanyProfit
      },
      alerts: [
        { id: 'ALT-1', type: 'info', title: '1 Pending investor payment for Sep 2026', actionRoute: 'Investors' },
        { id: 'ALT-2', type: 'info', title: '1 Office expense awaiting approval', actionRoute: 'Finance' }
      ]
    };
  }

  async getExpenses(filters?: { category?: string; status?: string }): Promise<Expense[]> {
    let list = [...this.expenses];
    if (filters?.category && filters.category !== 'All') {
      list = list.filter(e => e.category === filters.category);
    }
    if (filters?.status && filters.status !== 'All') {
      list = list.filter(e => e.status === filters.status);
    }
    return list;
  }

  async createExpense(data: Omit<Expense, 'expenseId' | 'createdAt'>, requestId?: string): Promise<Expense> {
    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId);
    }
    const seq = this.expenses.length + 1;
    const newId = `EXP-${('00000' + seq).slice(-5)}`;
    const newExpense: Expense = {
      ...data,
      expenseId: newId,
      createdAt: new Date().toISOString()
    };
    this.expenses.unshift(newExpense);
    if (requestId) this.idempotencyCache.set(requestId, newExpense);
    await this.logEvent('EXPENSE_CREATED', 'Finance', newId, null, newExpense, `Created expense: ${data.description}`);
    return newExpense;
  }

  async updateExpenseStatus(expenseId: string, status: Expense['status'], approverId?: string): Promise<Expense> {
    const idx = this.expenses.findIndex(e => e.expenseId === expenseId);
    if (idx === -1) throw new Error('Expense not found');
    const oldVal = { ...this.expenses[idx] };
    this.expenses[idx].status = status;
    if (approverId) {
      this.expenses[idx].approvedBy = approverId;
      this.expenses[idx].approvedAt = new Date().toISOString();
    }
    await this.logEvent('EXPENSE_STATUS_UPDATED', 'Finance', expenseId, oldVal, this.expenses[idx], `Status changed to ${status}`);
    return this.expenses[idx];
  }

  async getSalaries(filters?: { month?: string; staffId?: string }): Promise<Salary[]> {
    let list = [...this.salaries];
    if (filters?.month) {
      list = list.filter(s => s.salaryMonth === filters.month);
    }
    if (filters?.staffId) {
      list = list.filter(s => s.staffId === filters.staffId);
    }
    return list;
  }

  async createSalary(data: Omit<Salary, 'salaryId' | 'createdAt' | 'netSalary'>, requestId?: string): Promise<Salary> {
    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId);
    }
    const netSalary = calculateNetSalary(
      data.basicSalary,
      data.allowance,
      data.bonus,
      data.commission,
      data.deduction,
      data.advance
    );
    const seq = this.salaries.length + 1;
    const newId = `SAL-${('00000' + seq).slice(-5)}`;
    const newSalary: Salary = {
      ...data,
      salaryId: newId,
      netSalary,
      createdAt: new Date().toISOString()
    };
    this.salaries.push(newSalary);
    if (requestId) this.idempotencyCache.set(requestId, newSalary);
    await this.logEvent('SALARY_CREATED', 'Finance', newId, null, newSalary, `Salary slip for ${data.salaryMonth}`);
    return newSalary;
  }

  async updateSalaryStatus(salaryId: string, status: Salary['paymentStatus'], approverId?: string): Promise<Salary> {
    const idx = this.salaries.findIndex(s => s.salaryId === salaryId);
    if (idx === -1) throw new Error('Salary not found');
    const oldVal = { ...this.salaries[idx] };
    this.salaries[idx].paymentStatus = status;
    if (approverId) {
      this.salaries[idx].approvedBy = approverId;
      this.salaries[idx].approvedAt = new Date().toISOString();
    }
    await this.logEvent('SALARY_STATUS_UPDATED', 'Finance', salaryId, oldVal, this.salaries[idx], `Status changed to ${status}`);
    return this.salaries[idx];
  }

  // --- Audit Methods ---
  async getAuditLogs(filters?: { module?: string; userId?: string }): Promise<AuditLog[]> {
    let list = [...this.auditLogs];
    if (filters?.module && filters.module !== 'All') {
      list = list.filter(a => a.module === filters.module);
    }
    if (filters?.userId) {
      list = list.filter(a => a.userId === filters.userId);
    }
    return list;
  }

  async logEvent(
    action: string,
    module: string,
    recordId: string,
    oldValue?: any,
    newValue?: any,
    reason?: string
  ): Promise<AuditLog> {
    const seq = this.auditLogs.length + 1;
    const auditId = `AUD-${('00000' + seq).slice(-5)}`;
    const newLog: AuditLog = {
      auditId,
      timestamp: new Date().toISOString(),
      userId: this.currentUser ? this.currentUser.userId : 'USR-00001',
      action,
      module,
      recordId,
      oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
      newValue: newValue ? JSON.stringify(newValue) : undefined,
      reason
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }
}
