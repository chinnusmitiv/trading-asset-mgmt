/**
 * React Navigation Type Definitions
 */

import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Dashboard: undefined;
  Investors: undefined;
  Trading: undefined;
  Staff: undefined;
  Finance: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  InvestorDetails: { investorId: string };
  AddInvestor: undefined;
  AddInvestment: { investorId: string };
  RecordPayment: { investorId: string; investmentId?: string };
  AddBankDetails: { investorId: string };
  StaffDetails: { staffId: string };
  AddStaff: { staffId?: string } | undefined;
  StaffCommissions: { staffId?: string } | undefined;
  AddTrade: { staffId?: string } | undefined;
  TradeDetails: { tradeId: string };
  AddExpense: undefined;
  ExpenseDetails: { expenseId: string };
  ProcessPayroll: { staffId?: string; month?: string } | undefined;
  PayrollList: { month?: string } | undefined;
  SalaryDetails: { salaryId: string };
  Settings: undefined;
  AuditLog: undefined;
};
