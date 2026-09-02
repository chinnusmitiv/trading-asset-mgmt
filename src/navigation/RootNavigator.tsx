import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { THEME } from '../constants/theme';
import { useAuth } from '../store/AuthContext';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { TabNavigator } from './TabNavigator';
import { InvestorProfileScreen } from '../screens/investors/InvestorProfileScreen';
import { AddInvestorScreen } from '../screens/investors/AddInvestorScreen';
import { AddInvestmentScreen } from '../screens/investors/AddInvestmentScreen';
import { RecordPaymentScreen } from '../screens/investors/RecordPaymentScreen';
import { AddBankScreen } from '../screens/investors/AddBankScreen';
import { StaffDetailsScreen } from '../screens/staff/StaffDetailsScreen';
import { AddStaffScreen } from '../screens/staff/AddStaffScreen';
import { StaffCommissionsScreen } from '../screens/staff/StaffCommissionsScreen';
import { AddTradeScreen } from '../screens/trading/AddTradeScreen';
import { TradeDetailsScreen } from '../screens/trading/TradeDetailsScreen';
import { AddExpenseScreen } from '../screens/finance/AddExpenseScreen';
import { ExpenseDetailsScreen } from '../screens/finance/ExpenseDetailsScreen';
import { ProcessPayrollScreen } from '../screens/finance/ProcessPayrollScreen';
import { PayrollListScreen } from '../screens/finance/PayrollListScreen';
import { SalaryDetailsScreen } from '../screens/finance/SalaryDetailsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { AuditLogScreen } from '../screens/audit/AuditLogScreen';
import { LoadingState } from '../components/common/LoadingState';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState message="Initializing secure session..." />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: THEME.colors.accent.indigo,
          background: THEME.colors.background.primary,
          card: THEME.colors.background.card,
          text: THEME.colors.text.primary,
          border: THEME.colors.background.border,
          notification: THEME.colors.accent.rose
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' }
        }
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: THEME.colors.background.card
          },
          headerTintColor: THEME.colors.text.primary,
          headerTitleStyle: {
            fontWeight: '700'
          },
          headerBackTitle: ''
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InvestorDetails"
              component={InvestorProfileScreen}
              options={{ title: 'Investor Portfolio' }}
            />
            <Stack.Screen
              name="AddInvestor"
              component={AddInvestorScreen}
              options={{ title: 'Onboard Investor' }}
            />
            <Stack.Screen
              name="AddInvestment"
              component={AddInvestmentScreen}
              options={{ title: 'New Investment Tranche' }}
            />
            <Stack.Screen
              name="RecordPayment"
              component={RecordPaymentScreen}
              options={{ title: 'Record Disbursement' }}
            />
            <Stack.Screen
              name="AddBankDetails"
              component={AddBankScreen}
              options={{ title: 'Attach Bank Details' }}
            />
            <Stack.Screen
              name="StaffDetails"
              component={StaffDetailsScreen}
              options={{ title: 'Staff Trading Profile' }}
            />
            <Stack.Screen
              name="AddStaff"
              component={AddStaffScreen}
              options={{ title: 'Onboard Staff' }}
            />
            <Stack.Screen
              name="StaffCommissions"
              component={StaffCommissionsScreen}
              options={{ title: 'Commission Ledger' }}
            />
            <Stack.Screen
              name="AddTrade"
              component={AddTradeScreen}
              options={{ title: 'Log Trade Execution' }}
            />
            <Stack.Screen
              name="TradeDetails"
              component={TradeDetailsScreen}
              options={{ title: 'Trade Details' }}
            />
            <Stack.Screen
              name="AddExpense"
              component={AddExpenseScreen}
              options={{ title: 'Log Expense' }}
            />
            <Stack.Screen
              name="ExpenseDetails"
              component={ExpenseDetailsScreen}
              options={{ title: 'Expense Voucher' }}
            />
            <Stack.Screen
              name="ProcessPayroll"
              component={ProcessPayrollScreen}
              options={{ title: 'Process Payroll' }}
            />
            <Stack.Screen
              name="PayrollList"
              component={PayrollListScreen}
              options={{ title: 'Payroll Slips' }}
            />
            <Stack.Screen
              name="SalaryDetails"
              component={SalaryDetailsScreen}
              options={{ title: 'Salary Slip' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
            <Stack.Screen
              name="AuditLog"
              component={AuditLogScreen}
              options={{ title: 'Audit Trail' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
