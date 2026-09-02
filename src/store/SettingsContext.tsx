import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../constants/config';

interface SettingsState {
  useMockData: boolean;
  apiUrl: string;
  currency: string;
  timezone: string;
  setUseMockData: (val: boolean) => Promise<void>;
  setApiUrl: (url: string) => Promise<void>;
  setCurrency: (c: string) => Promise<void>;
  setTimezone: (tz: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsState | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [useMockData, setUseMockDataState] = useState<boolean>(APP_CONFIG.USE_MOCK_DATA);
  const [apiUrl, setApiUrlState] = useState<string>(APP_CONFIG.DEFAULT_API_URL);
  const [currency, setCurrencyState] = useState<string>(APP_CONFIG.DEFAULT_CURRENCY);
  const [timezone, setTimezoneState] = useState<string>(APP_CONFIG.DEFAULT_TIMEZONE);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.APP_SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.useMockData !== undefined) setUseMockDataState(parsed.useMockData);
        if (parsed.apiUrl) setApiUrlState(parsed.apiUrl);
        if (parsed.currency) setCurrencyState(parsed.currency);
        if (parsed.timezone) setTimezoneState(parsed.timezone);
      }
    } catch (e) {
      // Use defaults
    }
  };

  const saveSettings = async (updates: Partial<{ useMockData: boolean; apiUrl: string; currency: string; timezone: string }>) => {
    try {
      const current = { useMockData, apiUrl, currency, timezone, ...updates };
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.APP_SETTINGS, JSON.stringify(current));
    } catch (e) {
      // Storage error
    }
  };

  const setUseMockData = async (val: boolean) => {
    setUseMockDataState(val);
    await saveSettings({ useMockData: val });
  };

  const setApiUrl = async (url: string) => {
    setApiUrlState(url);
    await saveSettings({ apiUrl: url });
  };

  const setCurrency = async (c: string) => {
    setCurrencyState(c);
    await saveSettings({ currency: c });
  };

  const setTimezone = async (tz: string) => {
    setTimezoneState(tz);
    await saveSettings({ timezone: tz });
  };

  return (
    <SettingsContext.Provider
      value={{
        useMockData,
        apiUrl,
        currency,
        timezone,
        setUseMockData,
        setApiUrl,
        setCurrency,
        setTimezone
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
