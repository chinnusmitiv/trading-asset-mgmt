import { hasPermission } from '../src/services/auth/authService';
import { User } from '../src/types';

describe('RBAC Authorization & Permission Matrix', () => {
  const adminUser: User = {
    userId: 'USR-00001',
    username: 'admin',
    fullName: 'Admin User',
    email: 'admin@test.com',
    role: 'Admin',
    status: 'Active'
  };

  const managerUser: User = {
    userId: 'USR-00002',
    username: 'manager',
    fullName: 'Manager User',
    email: 'manager@test.com',
    role: 'Manager',
    status: 'Active'
  };

  const staffUser: User = {
    userId: 'USR-00003',
    username: 'staff1',
    fullName: 'Staff User',
    email: 'staff@test.com',
    role: 'Staff',
    staffId: 'STAFF-00002',
    status: 'Active'
  };

  describe('Admin Permissions', () => {
    it('grants full access to all capabilities', () => {
      expect(hasPermission(adminUser, 'VIEW_DASHBOARD')).toBe(true);
      expect(hasPermission(adminUser, 'VIEW_INVESTORS')).toBe(true);
      expect(hasPermission(adminUser, 'CREATE_INVESTOR')).toBe(true);
      expect(hasPermission(adminUser, 'VIEW_BANK_UNMASKED')).toBe(true);
      expect(hasPermission(adminUser, 'REVERSE_PAYMENT')).toBe(true);
      expect(hasPermission(adminUser, 'VIEW_ALL_SALARIES')).toBe(true);
      expect(hasPermission(adminUser, 'MANAGE_SETTINGS')).toBe(true);
      expect(hasPermission(adminUser, 'VIEW_AUDIT_LOG')).toBe(true);
    });
  });

  describe('Manager Permissions', () => {
    it('allows operational actions but restricts system settings & reversals', () => {
      expect(hasPermission(managerUser, 'VIEW_DASHBOARD')).toBe(true);
      expect(hasPermission(managerUser, 'VIEW_INVESTORS')).toBe(true);
      expect(hasPermission(managerUser, 'CREATE_INVESTOR')).toBe(true);
      expect(hasPermission(managerUser, 'APPROVE_PAYMENT')).toBe(true);
      expect(hasPermission(managerUser, 'VIEW_BANK_MASKED')).toBe(true);

      // Denied actions
      expect(hasPermission(managerUser, 'VIEW_BANK_UNMASKED')).toBe(false);
      expect(hasPermission(managerUser, 'REVERSE_PAYMENT')).toBe(false);
      expect(hasPermission(managerUser, 'MANAGE_SETTINGS')).toBe(false);
      expect(hasPermission(managerUser, 'VIEW_AUDIT_LOG')).toBe(false);
    });
  });

  describe('Staff Permissions', () => {
    it('restricts staff to personal trades and submissions', () => {
      expect(hasPermission(staffUser, 'VIEW_OWN_TRADES')).toBe(true);
      expect(hasPermission(staffUser, 'CREATE_TRADE')).toBe(true);
      expect(hasPermission(staffUser, 'SUBMIT_EXPENSE')).toBe(true);
      expect(hasPermission(staffUser, 'VIEW_OWN_SALARY')).toBe(true);

      // Forbidden
      expect(hasPermission(staffUser, 'VIEW_DASHBOARD')).toBe(false);
      expect(hasPermission(staffUser, 'VIEW_INVESTORS')).toBe(false);
      expect(hasPermission(staffUser, 'VIEW_ALL_TRADES')).toBe(false);
      expect(hasPermission(staffUser, 'APPROVE_EXPENSE')).toBe(false);
      expect(hasPermission(staffUser, 'MANAGE_SETTINGS')).toBe(false);
    });
  });

  describe('UI Navigation & More Menu RBAC Filtering', () => {
    const getVisibleTabs = (user: User) => {
      const isStaff = user.role === 'Staff';
      const allTabs = ['Dashboard', 'Investors', 'Trading', 'Staff', 'Finance', 'More'];
      return allTabs.filter(tab => {
        if (isStaff && (tab === 'Investors' || tab === 'Staff' || tab === 'Finance')) {
          return false;
        }
        return true;
      });
    };

    const getMoreMenuSections = (user: User) => {
      const isStaff = user.role === 'Staff';
      if (isStaff) {
        return ['MY WORKSPACE'];
      }
      return ['FINANCIAL & OPERATIONS', 'SECURITY & GOVERNANCE'];
    };

    it('hides Investors, Staff, and Finance tabs for Staff role in bottom navigation', () => {
      const staffTabs = getVisibleTabs(staffUser);
      expect(staffTabs).toEqual(['Dashboard', 'Trading', 'More']);
      expect(staffTabs).not.toContain('Investors');
      expect(staffTabs).not.toContain('Staff');
      expect(staffTabs).not.toContain('Finance');
    });

    it('shows all operational tabs for Admin and Manager roles', () => {
      const adminTabs = getVisibleTabs(adminUser);
      expect(adminTabs).toEqual(['Dashboard', 'Investors', 'Trading', 'Staff', 'Finance', 'More']);

      const managerTabs = getVisibleTabs(managerUser);
      expect(managerTabs).toEqual(['Dashboard', 'Investors', 'Trading', 'Staff', 'Finance', 'More']);
    });

    it('hides Financial & Operations and Security & Governance sections on More screen for Staff', () => {
      const staffSections = getMoreMenuSections(staffUser);
      expect(staffSections).toContain('MY WORKSPACE');
      expect(staffSections).not.toContain('FINANCIAL & OPERATIONS');
      expect(staffSections).not.toContain('SECURITY & GOVERNANCE');
    });

    it('shows Financial & Operations and Security & Governance sections on More screen for Admin/Manager', () => {
      const adminSections = getMoreMenuSections(adminUser);
      expect(adminSections).toContain('FINANCIAL & OPERATIONS');
      expect(adminSections).toContain('SECURITY & GOVERNANCE');
      expect(adminSections).not.toContain('MY WORKSPACE');

      const managerSections = getMoreMenuSections(managerUser);
      expect(managerSections).toContain('FINANCIAL & OPERATIONS');
      expect(managerSections).toContain('SECURITY & GOVERNANCE');
    });
  });

  it('rejects unauthenticated users', () => {
    expect(hasPermission(null, 'VIEW_DASHBOARD')).toBe(false);
    expect(hasPermission(undefined, 'VIEW_INVESTORS')).toBe(false);
  });
});
