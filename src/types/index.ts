/**
 * Core Domain Types & DTOs
 */

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export interface User {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  staffId?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
}

export type InvestorStatus = 'Active' | 'Inactive' | 'Suspended';

export interface Investor {
  investorId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  joiningDate: string;
  status: InvestorStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorBank {
  bankId: string;
  investorId: string;
  accountHolderName: string;
  bankName: string;
  accountNumberMasked: string; // e.g. "XXXX XXXX 4582"
  ifscCode: string;
  accountType: 'Savings' | 'Current';
  isPrimary: boolean;
  createdAt: string;
}

export interface InvestorDocument {
  documentId: string;
  entityType: 'Investor' | 'Staff' | 'Company' | 'Expense';
  entityId: string;
  documentType: 'Agreement' | 'KYC' | 'Bank_Proof' | 'Policy' | 'Investment_Doc' | 'Other';
  documentName: string;
  driveFileId?: string;
  driveUrl?: string;
  uploadedDate: string;
  expiryDate?: string;
  status: 'Valid' | 'Expiring' | 'Expired' | 'Revoked';
  createdBy?: string;
}

export type InvestmentStatus = 'Active' | 'Matured' | 'Closed' | 'Suspended';
export type PaymentFrequency = 'Monthly' | 'Quarterly' | 'Annual' | 'On_Maturity';

export interface Investment {
  investmentId: string;
  investorId: string;
  principalAmount: number;
  investmentDate: string;
  maturityDate?: string;
  returnPercentage: number;
  monthlyReturn: number;
  paymentFrequency: PaymentFrequency;
  policyId?: string;
  status: InvestmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type PaymentStatus = 'Pending' | 'Approved' | 'Paid' | 'Failed' | 'Cancelled' | 'Reversed';
export type PaymentMethod = 'Bank_Transfer' | 'UPI' | 'Cheque' | 'Cash' | 'Credit_Card';

export interface InvestorPayment {
  paymentId: string;
  investorId: string;
  investmentId: string;
  paymentDate: string;
  paymentMonth: string; // YYYY-MM
  principalAmount: number;
  profitAmount: number;
  otherAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export type StaffRole = 'Trader' | 'Manager' | 'Accountant' | 'Support';
export type StaffStatus = 'Active' | 'Inactive' | 'On_Leave';

export interface Staff {
  staffId: string;
  name: string;
  phone: string;
  email: string;
  role: StaffRole;
  department: string;
  joiningDate: string;
  basicSalary: number;
  tradingPercentage: number;
  commissionPercentage: number;
  status: StaffStatus;
  bankDetailsReference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TradeType = 'BUY' | 'SELL' | 'INTRADAY' | 'SWING' | 'OPTION';
export type TradeStatus = 'Draft' | 'Submitted' | 'Reviewed' | 'Settled';

export interface Trade {
  tradeId: string;
  staffId: string;
  tradeDate: string;
  asset: string;
  tradeType: TradeType;
  capitalUsed: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  grossProfit: number;
  grossLoss: number;
  netPnL: number;
  appliedPercentage: number;
  staffShare: number;
  companyShare: number;
  roiPercentage: number;
  status: TradeStatus;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Internet'
  | 'Telephone'
  | 'Travel'
  | 'Food'
  | 'Office_Supplies'
  | 'Software'
  | 'Equipment'
  | 'Maintenance'
  | 'Marketing'
  | 'Professional_Fees'
  | 'Other';

export type ExpenseStatus = 'Draft' | 'Submitted' | 'Approved' | 'Paid' | 'Rejected' | 'Cancelled';

export interface Expense {
  expenseId: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidBy?: string;
  vendor?: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export type SalaryStatus = 'Draft' | 'Approved' | 'Paid' | 'Cancelled';

export interface Salary {
  salaryId: string;
  staffId: string;
  salaryMonth: string; // YYYY-MM
  basicSalary: number;
  allowance: number;
  bonus: number;
  commission: number;
  deduction: number;
  advance: number;
  netSalary: number;
  paymentDate?: string;
  paymentStatus: SalaryStatus;
  paymentReference?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface AuditLog {
  auditId: string;
  timestamp: string;
  userId: string;
  action: string;
  module: string;
  recordId: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}

export interface DashboardSummary {
  period: string;
  capital: {
    total: number;
    deployed: number;
    available: number;
    utilizationPercentage: number;
  };
  investors: {
    activeCount: number;
    totalPrincipal: number;
    profitPaidMonth: number;
    pendingPaymentsCount: number;
  };
  trading: {
    monthlyPnL: number;
    totalTrades: number;
    winningTrades: number;
    winRate: number;
  };
  finance: {
    expensesMonth: number;
    salariesMonth: number;
    netCompanyProfit: number;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'danger';
    title: string;
    actionRoute: string;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  errorCode?: string;
  requestId: string;
  timestamp?: string;
}
