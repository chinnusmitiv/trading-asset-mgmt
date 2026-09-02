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
