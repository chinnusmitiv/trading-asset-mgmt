import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { THEME } from '../constants/theme';

import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { InvestorsListScreen } from '../screens/investors/InvestorsListScreen';
import { TradingDashboardScreen } from '../screens/trading/TradingDashboardScreen';
import { StaffListScreen } from '../screens/staff/StaffListScreen';
import { FinanceDashboardScreen } from '../screens/finance/FinanceDashboardScreen';
import { MoreMenuScreen } from '../screens/more/MoreMenuScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: THEME.colors.accent.indigo,
        tabBarInactiveTintColor: THEME.colors.text.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => {
          let icon = '📱';
          if (route.name === 'Dashboard') icon = '⚡';
          else if (route.name === 'Investors') icon = '👥';
          else if (route.name === 'Trading') icon = '📈';
          else if (route.name === 'Staff') icon = '👔';
          else if (route.name === 'Finance') icon = '💰';
          else if (route.name === 'More') icon = '⋯';

          return (
            <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
              {icon}
            </Text>
          );
        }
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Investors" component={InvestorsListScreen} />
      <Tab.Screen name="Trading" component={TradingDashboardScreen} />
      <Tab.Screen name="Staff" component={StaffListScreen} />
      <Tab.Screen name="Finance" component={FinanceDashboardScreen} />
      <Tab.Screen name="More" component={MoreMenuScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: THEME.colors.background.card,
    borderTopColor: THEME.colors.background.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700'
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.6
  },
  tabIconFocused: {
    opacity: 1
  }
});
