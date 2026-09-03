import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types';
import { APP_CONFIG } from '../constants/config';
import { MockRepository } from '../repositories/mockRepository';
import { AppsScriptRepository } from '../repositories/appsScriptRepository';
import { useSettings } from './SettingsContext';
import {
  IAuthRepository,
  IInvestorRepository,
  ITradeRepository,
  IStaffRepository,
  IFinanceRepository,
  IAuditRepository
} from '../repositories/interfaces';

type AppRepository = IAuthRepository &
  IInvestorRepository &
  ITradeRepository &
  IStaffRepository &
  IFinanceRepository &
  IAuditRepository;

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  repository: AppRepository;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Persistent singleton mock instance so mutations persist during session
const mockRepoInstance = new MockRepository();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { useMockData, apiUrl } = useSettings();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamically instantiate repository based on settings
  const repository: AppRepository = React.useMemo(() => {
    if (useMockData) {
      return mockRepoInstance;
    }
    const gasRepo = new AppsScriptRepository(apiUrl);
    if (token) gasRepo.setToken(token);
    return gasRepo;
  }, [useMockData, apiUrl, token]);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      const storedUser = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (e) {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await repository.login(username, password);
      setUser(res.user);
      setToken(res.token);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, res.token);
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await repository.logout();
    } catch (e) {
      // Continue cleanup
    } finally {
      setUser(null);
      setToken(null);
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER);
      setIsLoading(false);
    }
  };

  const switchRole = (newRole: UserRole) => {
    if (!user) return;
    const updated: User = {
      ...user,
      role: newRole,
      staffId: newRole === 'Staff' ? 'STAFF-00002' : user.staffId
    };
    setUser(updated);
    AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        repository,
        login,
        logout,
        switchRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
