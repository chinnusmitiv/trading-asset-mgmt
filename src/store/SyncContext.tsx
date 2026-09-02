import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { syncService, QueuedMutation } from '../services/sync/syncService';
import { useAuth } from './AuthContext';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  pendingMutations: QueuedMutation[];
  syncNow: () => Promise<{ processed: number; failed: number }>;
  toggleOnlineStatus: () => void;
  clearPendingQueue: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { repository } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingMutations, setPendingMutations] = useState<QueuedMutation[]>([]);

  const refreshState = useCallback(() => {
    setPendingCount(syncService.getPendingCount());
    setPendingMutations(syncService.getPendingMutations());
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      return { processed: 0, failed: 0 };
    }

    setIsSyncing(true);
    const result = await syncService.flushQueue(async (mutation: QueuedMutation) => {
      try {
        if (mutation.action === 'EXPENSE_CREATE') {
          await repository.createExpense(mutation.payload, mutation.requestId);
        } else if (mutation.action === 'PAYMENT_RECORD') {
          await repository.recordPayment(mutation.payload, mutation.requestId);
        } else if (mutation.action === 'TRADE_CREATE') {
          await repository.createTrade(mutation.payload, mutation.requestId);
        } else if (mutation.action === 'SALARY_CREATE') {
          await repository.createSalary(mutation.payload, mutation.requestId);
        }
        return true;
      } catch (err) {
        return false;
      }
    });

    setIsSyncing(false);
    refreshState();
    return result;
  }, [isOnline, repository, refreshState]);

  const toggleOnlineStatus = useCallback(() => {
    setIsOnline(prev => {
      const next = !prev;
      if (next) {
        // Trigger sync upon reconnecting
        setTimeout(() => syncNow(), 500);
      }
      return next;
    });
  }, [syncNow]);

  const clearPendingQueue = useCallback(() => {
    syncService.clearQueue();
    refreshState();
  }, [refreshState]);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        pendingMutations,
        syncNow,
        toggleOnlineStatus,
        clearPendingQueue
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
