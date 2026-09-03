import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { SettingsProvider } from './src/store/SettingsContext';
import { AuthProvider } from './src/store/AuthContext';
import { SyncProvider } from './src/store/SyncContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Keep the splash screen visible while app initializes resources
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    async function prepare() {
      try {
        // Allow splash screen logo to display smoothly
        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (e) {
        console.warn('Splash screen preparation error:', e);
      } finally {
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, []);

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
