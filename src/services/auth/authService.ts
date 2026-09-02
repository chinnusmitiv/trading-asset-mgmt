/**
 * Authentication & RBAC Authorization Service
 */

import { User, UserRole } from '../../types';

export type PermissionAction =
  | 'VIEW_DASHBOARD'
  | 'VIEW_INVESTORS'
  | 'CREATE_INVESTOR'
  | 'EDIT_INVESTOR'
  | 'VIEW_BANK_MASKED'
  | 'VIEW_BANK_UNMASKED'
  | 'CREATE_INVESTMENT'
  | 'APPROVE_PAYMENT'
  | 'REVERSE_PAYMENT'
  | 'VIEW_ALL_TRADES'
  | 'VIEW_OWN_TRADES'
  | 'CREATE_TRADE'
  | 'REVIEW_TRADE'
  | 'VIEW_ALL_STAFF'
  | 'VIEW_ALL_SALARIES'
  | 'VIEW_OWN_SALARY'
  | 'PROCESS_SALARY'
  | 'VIEW_EXPENSES'
  | 'SUBMIT_EXPENSE'
  | 'APPROVE_EXPENSE'
  | 'VIEW_AUDIT_LOG'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_USERS';

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  Admin: [
    'VIEW_DASHBOARD',
    'VIEW_INVESTORS',
    'CREATE_INVESTOR',
    'EDIT_INVESTOR',
    'VIEW_BANK_MASKED',
    'VIEW_BANK_UNMASKED',
    'CREATE_INVESTMENT',
    'APPROVE_PAYMENT',
    'REVERSE_PAYMENT',
    'VIEW_ALL_TRADES',
    'VIEW_OWN_TRADES',
    'CREATE_TRADE',
    'REVIEW_TRADE',
    'VIEW_ALL_STAFF',
    'VIEW_ALL_SALARIES',
    'VIEW_OWN_SALARY',
    'PROCESS_SALARY',
    'VIEW_EXPENSES',
    'SUBMIT_EXPENSE',
    'APPROVE_EXPENSE',
    'VIEW_AUDIT_LOG',
    'MANAGE_SETTINGS',
    'MANAGE_USERS'
  ],
  Manager: [
    'VIEW_DASHBOARD',
    'VIEW_INVESTORS',
    'CREATE_INVESTOR',
    'EDIT_INVESTOR',
    'VIEW_BANK_MASKED',
    'CREATE_INVESTMENT',
    'APPROVE_PAYMENT',
    'VIEW_ALL_TRADES',
    'VIEW_OWN_TRADES',
    'CREATE_TRADE',
    'REVIEW_TRADE',
    'VIEW_ALL_STAFF',
    'VIEW_EXPENSES',
    'SUBMIT_EXPENSE',
    'APPROVE_EXPENSE'
  ],
  Staff: [
    'VIEW_OWN_TRADES',
    'CREATE_TRADE',
    'VIEW_OWN_SALARY',
    'SUBMIT_EXPENSE'
  ]
};

export function hasPermission(user: User | null | undefined, action: PermissionAction): boolean {
  if (!user) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  return permissions.includes(action);
}
