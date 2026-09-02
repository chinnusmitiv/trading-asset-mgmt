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
  AddTrade: undefined;
  AddExpense: undefined;
  Settings: undefined;
  AuditLog: undefined;
};
