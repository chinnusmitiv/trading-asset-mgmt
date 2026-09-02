/**
 * Google Apps Script API Repository Adapter
 *
 * Implements repository interfaces via HTTPS requests to deployed Google Apps Script Web App.
 */

import { ApiClient } from '../services/api/apiClient';
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

export class AppsScriptRepository
  implements
    IAuthRepository,
    IInvestorRepository,
    ITradeRepository,
    IStaffRepository,
    IFinanceRepository,
    IAuditRepository
{
  private client: ApiClient;

  constructor(apiUrl: string) {
    this.client = new ApiClient(apiUrl);
  }

  public setToken(token: string | null) {
    this.client.setToken(token);
  }

  public setApiUrl(url: string) {
    this.client.setBaseUrl(url);
  }

  // --- Auth ---
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.client.request<{ token: string; user: User }>('auth.login', {
      username,
      password
    });
    if (!res.success || !res.data) throw new Error(res.message);
    this.setToken(res.data.token);
    return res.data;
  }

  async getCurrentUser(): Promise<User | null> {
    const res = await this.client.request<User>('auth.currentUser');
    return res.success ? res.data : null;
  }

  async logout(): Promise<void> {
    await this.client.request('auth.logout');
    this.setToken(null);
  }

  // --- Investors ---
  async getInvestors(filters?: { status?: string; search?: string }): Promise<Investor[]> {
    const res = await this.client.request<Investor[]>('investors.list', filters);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getInvestorDetails(investorId: string) {
    const res = await this.client.request<any>('investors.get', { investorId });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async createInvestor(data: Omit<Investor, 'investorId' | 'createdAt' | 'updatedAt'>): Promise<Investor> {
    const res = await this.client.request<Investor>('investors.create', data);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async updateInvestor(investorId: string, fields: Partial<Investor>): Promise<Investor> {
    const res = await this.client.request<Investor>('investors.update', { investorId, fields });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async createInvestment(data: Omit<Investment, 'investmentId' | 'createdAt' | 'updatedAt'>): Promise<Investment> {
    const res = await this.client.request<Investment>('investments.create', data);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async recordPayment(data: Omit<InvestorPayment, 'paymentId' | 'createdAt'>, requestId?: string): Promise<InvestorPayment> {
    const res = await this.client.request<InvestorPayment>('payments.create', data, requestId);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async updatePaymentStatus(paymentId: string, status: InvestorPayment['status'], paymentReference?: string, requestId?: string): Promise<InvestorPayment> {
    const res = await this.client.request<InvestorPayment>('payments.markPaid', { paymentId, status, paymentReference }, requestId);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async reversePayment(paymentId: string, reason: string, requestId?: string): Promise<InvestorPayment> {
    const res = await this.client.request<InvestorPayment>('payments.reverse', { paymentId, reason }, requestId);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async addBankDetails(data: Omit<InvestorBank, 'bankId' | 'createdAt'>): Promise<InvestorBank> {
    const res = await this.client.request<InvestorBank>('bank.create', data);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getInvestorDocuments(investorId: string): Promise<InvestorDocument[]> {
    const res = await this.client.request<InvestorDocument[]>('documents.list', { entityId: investorId });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  // --- Trades ---
  async getTrades(filters?: { staffId?: string; status?: string; asset?: string }): Promise<Trade[]> {
    const res = await this.client.request<Trade[]>('trades.list', filters);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getTradeDetails(tradeId: string): Promise<Trade | null> {
    const res = await this.client.request<Trade>('trades.get', { tradeId });
    return res.success ? res.data : null;
  }

  async createTrade(data: any, requestId?: string): Promise<Trade> {
    const res = await this.client.request<Trade>('trades.create', data, requestId);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async updateTradeStatus(tradeId: string, status: Trade['status'], notes?: string): Promise<Trade> {
    const res = await this.client.request<Trade>('trades.update', { tradeId, status, notes });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async settleTrade(tradeId: string, requestId?: string): Promise<{ trade: Trade; commission?: StaffCommission }> {
    const res = await this.client.request<{ trade: Trade; commission?: StaffCommission }>('trades.settle', { tradeId }, requestId);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  // --- Staff ---
  async getStaffList(): Promise<Staff[]> {
    const res = await this.client.request<Staff[]>('staff.list');
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getStaffById(staffId: string): Promise<Staff | null> {
    const res = await this.client.request<Staff>('staff.get', { staffId });
    return res.success ? res.data : null;
  }

  async getStaffDetails(staffId: string) {
    const res = await this.client.request<any>('staff.details', { staffId });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async createStaff(data: Omit<Staff, 'staffId' | 'createdAt' | 'updatedAt'>): Promise<Staff> {
    const res = await this.client.request<Staff>('staff.create', data);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async updateStaff(staffId: string, fields: Partial<Staff>): Promise<Staff> {
    const res = await this.client.request<Staff>('staff.update', { staffId, fields });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getCommissions(filters?: { staffId?: string; period?: string }): Promise<StaffCommission[]> {
    const res = await this.client.request<StaffCommission[]>('commissions.list', filters);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async calculateAndCreateCommission(data: Omit<StaffCommission, 'commissionId' | 'createdAt'>, requestId?: string): Promise<StaffCommission> {
    const res = await this.client.request<StaffCommission>('commissions.create', data, requestId);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async updateCommissionStatus(commissionId: string, status: StaffCommission['status']): Promise<StaffCommission> {
    const res = await this.client.request<StaffCommission>('commissions.approve', { commissionId, status });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  // --- Finance ---
  async getDashboardSummary(period?: string): Promise<DashboardSummary> {
    const res = await this.client.request<DashboardSummary>('dashboard.summary', { period });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getExpenses(filters?: { category?: string; status?: string }): Promise<Expense[]> {
    const res = await this.client.request<Expense[]>('expenses.list', filters);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getExpenseDetails(expenseId: string): Promise<Expense | null> {
    const res = await this.client.request<Expense>('expenses.get', { expenseId });
    return res.success ? res.data : null;
  }

  async createExpense(data: Omit<Expense, 'expenseId' | 'createdAt'>, requestId?: string): Promise<Expense> {
    const res = await this.client.request<Expense>('expenses.create', data, requestId);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async updateExpenseStatus(expenseId: string, status: Expense['status'], approverId?: string, paymentReference?: string): Promise<Expense> {
    const res = await this.client.request<Expense>('expenses.approve', { expenseId, status, approverId, paymentReference });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getSalaries(filters?: { month?: string; staffId?: string; status?: string }): Promise<Salary[]> {
    const res = await this.client.request<Salary[]>('salaries.list', filters);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getSalaryDetails(salaryId: string): Promise<Salary | null> {
    const res = await this.client.request<Salary>('salaries.get', { salaryId });
    return res.success ? res.data : null;
  }

  async createSalary(data: Omit<Salary, 'salaryId' | 'createdAt'>, requestId?: string): Promise<Salary> {
    const res = await this.client.request<Salary>('salaries.create', data, requestId);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async updateSalaryStatus(salaryId: string, status: Salary['paymentStatus'], approverId?: string, paymentReference?: string): Promise<Salary> {
    const res = await this.client.request<Salary>('salaries.approve', { salaryId, status, approverId, paymentReference });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async getStaffUnpaidCommissions(staffId: string, month: string): Promise<number> {
    const res = await this.client.request<{ unpaidCommissions: number }>('staff.unpaidCommissions', { staffId, month });
    return res.success && res.data ? res.data.unpaidCommissions : 0;
  }

  // --- Audit ---
  async getAuditLogs(filters?: { module?: string; userId?: string }): Promise<AuditLog[]> {
    const res = await this.client.request<AuditLog[]>('audit.list', filters);
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }

  async logEvent(action: string, module: string, recordId: string, oldValue?: any, newValue?: any, reason?: string): Promise<AuditLog> {
    const res = await this.client.request<AuditLog>('audit.log', {
      action,
      module,
      recordId,
      oldValue,
      newValue,
      reason
    });
    if (!res.success || !res.data) throw new Error(res.message);
    return res.data;
  }
}
