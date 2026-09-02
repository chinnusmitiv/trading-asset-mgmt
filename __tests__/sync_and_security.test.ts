import { syncService, QueuedMutation } from '../src/services/sync/syncService';
import { MockRepository } from '../src/repositories/mockRepository';
import { maskBankAccount, maskPhoneNumber } from '../src/utils/masking';
import { hasPermission } from '../src/services/auth/authService';
import { User } from '../src/types';

describe('Sync Queue, Offline Caching & Security Hardening Test Suite (Phase 5)', () => {
  let repo: MockRepository;

  beforeEach(() => {
    repo = new MockRepository();
    syncService.clearQueue();
    syncService.clearCache();
  });

  describe('Offline Mutation Queue & Idempotency', () => {
    it('enqueues mutations offline, preserves requestId, and flushes successfully', async () => {
      const customRequestId = 'REQ-OFFLINE-EXP-8899';
      const mutation = syncService.enqueueMutation(
        'EXPENSE_CREATE',
        'Finance',
        {
          expenseDate: '2026-09-02',
          category: 'Office_Supplies',
          description: 'Desk Monitors and Stands',
          amount: 25000,
          paymentMethod: 'Credit_Card',
          status: 'Approved'
        },
        customRequestId
      );

      expect(mutation.requestId).toBe(customRequestId);
      expect(syncService.getPendingCount()).toBe(1);

      // Flush queue
      const result = await syncService.flushQueue(async (m: QueuedMutation) => {
        if (m.action === 'EXPENSE_CREATE') {
          await repo.createExpense(m.payload, m.requestId);
          return true;
        }
        return false;
      });

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(0);
      expect(syncService.getPendingCount()).toBe(0);

      // Verify expense exists in repository
      const expenses = await repo.getExpenses({ category: 'Office_Supplies' });
      const found = expenses.find(e => e.description === 'Desk Monitors and Stands');
      expect(found).toBeDefined();
      expect(found?.amount).toBe(25000);
    });

    it('handles executor failures gracefully without losing queued items', async () => {
      syncService.enqueueMutation('INVALID_ACTION', 'Unknown', { test: 123 });
      expect(syncService.getPendingCount()).toBe(1);

      const result = await syncService.flushQueue(async () => {
        return false; // Simulate network timeout or failure
      });

      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
      expect(syncService.getPendingCount()).toBe(1);
      expect(syncService.getPendingMutations()[0].retryCount).toBe(1);
    });
  });

  describe('Local Data Cache Engine', () => {
    it('sets and retrieves cached data before TTL expires', () => {
      const sampleData = { aum: 50000000, activeInvestors: 5 };
      syncService.setCache('DASHBOARD_SNAPSHOT', sampleData, 5000);

      const cached = syncService.getCache<typeof sampleData>('DASHBOARD_SNAPSHOT');
      expect(cached).toEqual(sampleData);
    });

    it('invalidates cache when TTL has expired', () => {
      const sampleData = { key: 'old' };
      syncService.setCache('EXPIRED_KEY', sampleData, -1000); // Already expired

      const cached = syncService.getCache('EXPIRED_KEY');
      expect(cached).toBeNull();
    });
  });

  describe('Data Masking, Security & RBAC Hardening', () => {
    it('masks bank accounts to show only the last 4 digits', () => {
      expect(maskBankAccount('50100234564582')).toBe('XXXX XXXX 4582');
      expect(maskBankAccount('123456789')).toBe('XXXX XXXX 6789');
    });

    it('masks phone numbers for non-admin users', () => {
      expect(maskPhoneNumber('+91 98765 43210')).toBe('+91 98****210');
    });

    it('enforces RBAC permissions strictly across Admin, Manager, and Staff roles', () => {
      const adminUser: User = { userId: 'USR-1', username: 'admin', fullName: 'Super Admin', email: 'admin@firm.internal', role: 'Admin', status: 'Active' };
      const managerUser: User = { userId: 'USR-2', username: 'manager', fullName: 'Desk Manager', email: 'mgr@firm.internal', role: 'Manager', status: 'Active' };
      const staffUser: User = { userId: 'USR-3', username: 'trader', fullName: 'Prop Trader', email: 'trader@firm.internal', role: 'Staff', staffId: 'STAFF-00002', status: 'Active' };

      // VIEW_AUDIT_LOG
      expect(hasPermission(adminUser, 'VIEW_AUDIT_LOG')).toBe(true);
      expect(hasPermission(managerUser, 'VIEW_AUDIT_LOG')).toBe(false);
      expect(hasPermission(staffUser, 'VIEW_AUDIT_LOG')).toBe(false);

      // APPROVE_EXPENSE
      expect(hasPermission(adminUser, 'APPROVE_EXPENSE')).toBe(true);
      expect(hasPermission(managerUser, 'APPROVE_EXPENSE')).toBe(true);
      expect(hasPermission(staffUser, 'APPROVE_EXPENSE')).toBe(false);

      // CREATE_TRADE
      expect(hasPermission(adminUser, 'CREATE_TRADE')).toBe(true);
      expect(hasPermission(managerUser, 'CREATE_TRADE')).toBe(true);
      expect(hasPermission(staffUser, 'CREATE_TRADE')).toBe(true);
    });
  });
});
