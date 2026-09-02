import React from 'react';
import { Text, StyleSheet, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 8);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 6
          }
        ],
        tabBarItemStyle: styles.tabBarItem,
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
            <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
              <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
                {icon}
              </Text>
            </View>
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
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 6
  },
  tabBarItem: {
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconContainer: {
    width: 32,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  iconContainerFocused: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)'
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 0
  },
  tabIcon: {
    fontSize: 16,
    opacity: 0.5
  },
  tabIconFocused: {
    opacity: 1
  }
});
