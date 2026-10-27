import { MockRepository } from '../src/repositories/mockRepository';
import { hasPermission } from '../src/services/auth/authService';

describe('In-App Staff Login Creation Test Suite', () => {
  let repo: MockRepository;

  beforeEach(() => {
    repo = new MockRepository();
  });

  describe('Direct Staff Onboarding with App Login Credentials', () => {
    it('creates staff profile and active login account simultaneously', async () => {
      const result = await repo.createStaff(
        {
          name: 'Sunil Gavaskar',
          phone: '+91 98111 22334',
          email: 'sunil@assetmgmt.internal',
          role: 'Trader',
          department: 'Prop Trading',
          joiningDate: '2026-10-27',
          basicSalary: 85000,
          tradingPercentage: 22,
          commissionPercentage: 0,
          status: 'Active'
        },
        {
          username: 'sunil.gavaskar',
          password: 'SecretPassword123',
          role: 'Staff'
        }
      );

      // Verify staff entity
      expect(result.staffId).toBeDefined();
      expect(result.name).toBe('Sunil Gavaskar');
      expect(result.tradingPercentage).toBe(22);

      // Verify attached user entity
      expect(result.user).toBeDefined();
      expect(result.user?.userId).toBeDefined();
      expect(result.user?.username).toBe('sunil.gavaskar');
      expect(result.user?.role).toBe('Staff');
      expect(result.user?.staffId).toBe(result.staffId);
      expect(result.user?.status).toBe('Active');

      // Verify immediate login with newly created credentials
      const loginRes = await repo.login('sunil.gavaskar', 'SecretPassword123');
      expect(loginRes.token).toBeDefined();
      expect(loginRes.user.username).toBe('sunil.gavaskar');
      expect(loginRes.user.staffId).toBe(result.staffId);
      expect(loginRes.user.role).toBe('Staff');

      // Verify case-insensitive username login
      const caseRes = await repo.login('SUNIL.GAVASKAR', 'SecretPassword123');
      expect(caseRes.user.userId).toBe(result.user?.userId);

      // Verify authentication fails with incorrect password
      await expect(repo.login('sunil.gavaskar', 'WrongPassword')).rejects.toThrow('Invalid credentials');
    });

    it('enforces RBAC permissions matching the assigned user role', async () => {
      // 1. Create a Desk Manager staff + login
      const managerResult = await repo.createStaff(
        {
          name: 'Rohit Sharma',
          phone: '+91 98222 33445',
          email: 'rohit@assetmgmt.internal',
          role: 'Manager',
          department: 'Operations',
          joiningDate: '2026-10-27',
          basicSalary: 160000,
          tradingPercentage: 0,
          commissionPercentage: 5,
          status: 'Active'
        },
        {
          username: 'rohit',
          password: 'rohit123',
          role: 'Manager'
        }
      );

      expect(managerResult.user?.role).toBe('Manager');

      // Verify Manager permissions
      expect(hasPermission(managerResult.user, 'VIEW_INVESTORS')).toBe(true);
      expect(hasPermission(managerResult.user, 'CREATE_INVESTOR')).toBe(true);
      expect(hasPermission(managerResult.user, 'VIEW_ALL_TRADES')).toBe(true);
      expect(hasPermission(managerResult.user, 'APPROVE_PAYMENT')).toBe(true);
      // Manager should NOT have super admin privileges
      expect(hasPermission(managerResult.user, 'REVERSE_PAYMENT')).toBe(false);
      expect(hasPermission(managerResult.user, 'VIEW_BANK_UNMASKED')).toBe(false);
      expect(hasPermission(managerResult.user, 'VIEW_AUDIT_LOG')).toBe(false);

      // 2. Create a Trader staff + login
      const traderResult = await repo.createStaff(
        {
          name: 'Jasprit Bumrah',
          phone: '+91 98333 44556',
          email: 'jasprit@assetmgmt.internal',
          role: 'Trader',
          department: 'Prop Trading',
          joiningDate: '2026-10-27',
          basicSalary: 80000,
          tradingPercentage: 20,
          commissionPercentage: 0,
          status: 'Active'
        },
        {
          username: 'jasprit',
          password: 'trader123',
          role: 'Staff'
        }
      );

      expect(traderResult.user?.role).toBe('Staff');

      // Verify Staff permissions
      expect(hasPermission(traderResult.user, 'VIEW_OWN_TRADES')).toBe(true);
      expect(hasPermission(traderResult.user, 'CREATE_TRADE')).toBe(true);
      expect(hasPermission(traderResult.user, 'VIEW_OWN_SALARY')).toBe(true);
      // Staff must NOT see investors or firm books
      expect(hasPermission(traderResult.user, 'VIEW_INVESTORS')).toBe(false);
      expect(hasPermission(traderResult.user, 'VIEW_ALL_TRADES')).toBe(false);
      expect(hasPermission(traderResult.user, 'VIEW_ALL_SALARIES')).toBe(false);
    });

    it('prevents duplicate usernames and rejects collisions', async () => {
      // 'admin' is already taken
      await expect(
        repo.createStaff(
          {
            name: 'Imposter Admin',
            phone: '+91 98999 11111',
            email: 'fake@admin.com',
            role: 'Trader',
            department: 'Prop Trading',
            joiningDate: '2026-10-27',
            basicSalary: 80000,
            tradingPercentage: 20,
            commissionPercentage: 0,
            status: 'Active'
          },
          {
            username: 'admin',
            password: 'password123',
            role: 'Staff'
          }
        )
      ).rejects.toThrow('Username "admin" is already taken');
    });

    it('maintains backwards-compatibility when onboarding staff without login credentials', async () => {
      const created = await repo.createStaff({
        name: 'Offline Contractor',
        phone: '+91 98777 66554',
        email: 'contractor@assetmgmt.internal',
        role: 'Accountant',
        department: 'Finance',
        joiningDate: '2026-10-27',
        basicSalary: 60000,
        tradingPercentage: 0,
        commissionPercentage: 0,
        status: 'Active'
      });

      expect(created.staffId).toBeDefined();
      expect(created.name).toBe('Offline Contractor');
      expect(created.user).toBeUndefined();

      // Attempting to log in as contractor throws invalid credentials
      await expect(repo.login('contractor')).rejects.toThrow('Invalid credentials');
    });

    it('allows seeded staff Priya Patel (STAFF-00003) to authenticate', async () => {
      const loginRes = await repo.login('priya', 'trader123');
      expect(loginRes.user.username).toBe('priya');
      expect(loginRes.user.staffId).toBe('STAFF-00003');
      expect(loginRes.user.fullName).toBe('Priya Patel');
    });
  });
});
