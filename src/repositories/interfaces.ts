/**
 * Repository Interfaces
 * Decouples the application screens from storage implementations (GAS vs Mock vs Supabase/Postgres).
 */

import {
  User,
  Investor,
  InvestorBank,
  Investment,
  InvestorPayment,
  InvestorDocument,
  Staff,
  Trade,
  Expense,
  Salary,
  AuditLog,
  DashboardSummary
} from '../types';

export interface IAuthRepository {
  login(username: string, password: string): Promise<{ token: string; user: User }>;
  getCurrentUser(): Promise<User | null>;
  logout(): Promise<void>;
}

export interface IInvestorRepository {
  getInvestors(filters?: { status?: string; search?: string }): Promise<Investor[]>;
  getInvestorDetails(investorId: string): Promise<{
    investor: Investor;
    bank?: InvestorBank;
    investments: Investment[];
    payments: InvestorPayment[];
    documents?: InvestorDocument[];
  }>;
  createInvestor(investor: Omit<Investor, 'investorId' | 'createdAt' | 'updatedAt'>): Promise<Investor>;
  updateInvestor(investorId: string, fields: Partial<Investor>): Promise<Investor>;
  createInvestment(investment: Omit<Investment, 'investmentId' | 'createdAt' | 'updatedAt'>): Promise<Investment>;
  recordPayment(payment: Omit<InvestorPayment, 'paymentId' | 'createdAt'>, requestId?: string): Promise<InvestorPayment>;
  updatePaymentStatus(paymentId: string, status: InvestorPayment['status'], paymentReference?: string, requestId?: string): Promise<InvestorPayment>;
  reversePayment(paymentId: string, reason: string, requestId?: string): Promise<InvestorPayment>;
  addBankDetails(bank: Omit<InvestorBank, 'bankId' | 'createdAt'>): Promise<InvestorBank>;
  getInvestorDocuments(investorId: string): Promise<InvestorDocument[]>;
}

export interface ITradeRepository {
  getTrades(filters?: { staffId?: string; status?: string }): Promise<Trade[]>;
  createTrade(trade: Omit<Trade, 'tradeId' | 'createdAt' | 'netPnL' | 'staffShare' | 'companyShare' | 'roiPercentage' | 'appliedPercentage'>, requestId?: string): Promise<Trade>;
  updateTradeStatus(tradeId: string, status: Trade['status'], notes?: string): Promise<Trade>;
}

export interface IStaffRepository {
  getStaffList(): Promise<Staff[]>;
  getStaffById(staffId: string): Promise<Staff | null>;
  createStaff(staff: Omit<Staff, 'staffId' | 'createdAt' | 'updatedAt'>): Promise<Staff>;
  updateStaff(staffId: string, fields: Partial<Staff>): Promise<Staff>;
}

export interface IFinanceRepository {
  getDashboardSummary(period?: string): Promise<DashboardSummary>;
  getExpenses(filters?: { category?: string; status?: string }): Promise<Expense[]>;
  createExpense(expense: Omit<Expense, 'expenseId' | 'createdAt'>, requestId?: string): Promise<Expense>;
  updateExpenseStatus(expenseId: string, status: Expense['status'], approverId?: string): Promise<Expense>;
  getSalaries(filters?: { month?: string; staffId?: string }): Promise<Salary[]>;
  createSalary(salary: Omit<Salary, 'salaryId' | 'createdAt' | 'netSalary'>, requestId?: string): Promise<Salary>;
  updateSalaryStatus(salaryId: string, status: Salary['paymentStatus'], approverId?: string): Promise<Salary>;
}

export interface IAuditRepository {
  getAuditLogs(filters?: { module?: string; userId?: string }): Promise<AuditLog[]>;
  logEvent(action: string, module: string, recordId: string, oldValue?: any, newValue?: any, reason?: string): Promise<AuditLog>;
}
