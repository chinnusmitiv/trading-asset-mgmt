import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider } from './src/store/SettingsContext';
import { AuthProvider } from './src/store/AuthContext';
import { SyncProvider } from './src/store/SyncContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <SyncProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </SyncProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
