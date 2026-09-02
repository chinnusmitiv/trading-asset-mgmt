# Comprehensive Quality Assurance & Test Plan

This document outlines the testing strategy, test suites, coverage targets, and test automation procedures for the Asset Management platform.

---

## 1. Testing Strategy & Pyramid

```text
       / \
      /   \      UI & Manual Flows (Login, Tabs, Filter sheets, Confirm Dialogs)
     / ----\
    /       \    Integration Tests (Repository Contracts, Auth, State Transitions)
   / --------\
  /           \  Unit Tests (Financial Invariants, P&L, Staff Share, Net Salary, ROI)
 /_____________\
```

---

## 2. Unit Testing Scope (Calculations Engine)

All financial functions in `src/utils/calculations.ts` must maintain 100% test coverage with edge-case validation:

1. **`calculateTradePnL(grossProfit, grossLoss)`**:
   - Standard profit: `100,000 - 20,000 = 80,000`
   - Break-even: `50,000 - 50,000 = 0`
   - Loss: `10,000 - 45,000 = -35,000`
   - Zero values and floating-point precision checks.

2. **`calculateStaffShare(netPnL, appliedStaffPercentage)` & `calculateCompanyShare`**:
   - Invariant: `staff_share + company_share == netPnL`
   - Zero staff share on loss (traders do not absorb negative cash unless configured).
   - Rate changes do not affect historical calculations.

3. **`calculateInvestorMonthlyReturn(principal, returnPercentage, paymentFrequency)`**:
   - `5,000,000 * 2.5% = 125,000/mo`
   - Quarterly / Annual frequency derivations.

4. **`calculateOutstandingPrincipal(totalPrincipal, principalRepaid)`**:
   - Invariant: `outstanding <= totalPrincipal` and `>= 0`.

5. **`calculateNetSalary(basic, allowance, bonus, commission, deduction, advance)`**:
   - Invariant: `netSalary == basic + allowance + bonus + commission - deduction - advance`
   - Clamping and negative validation.

6. **`calculateCompanyNetProfit(tradingPnL, otherIncome, payouts, commission, expenses, salaries, otherExpenses)`**:
   - Precise arithmetic balance against ledger totals.

7. **`calculateROI(netProfit, capitalBase)` & `calculateWinRate(winning, total)`**:
   - Zero division protection (`capitalBase == 0 -> 0%`).

---

## 3. RBAC & Security Test Cases

- **Admin**: Can access all actions and settings.
- **Manager**: Cannot alter system settings, cannot delete records, can approve payments/expenses.
- **Staff**: Cannot view other staff salaries, cannot view confidential investor bank details, can only view own trades and submit trades.

---

## 4. Repository & Integration Tests

- **Mock Repository Verification**:
  - Validates that the seed dataset loads 5 investors, 3 staff, 10 investments, 20 payments, 30 trades, 10 expenses, 5 salaries.
  - CRUD operations update in-memory state accurately.
  - Idempotency key prevents duplicate transaction creation.

---

## 5. Verification Commands

- Run Unit & Integration Tests:
  ```bash
  npm test
  ```
- Run TypeScript Type Check:
  ```bash
  npx tsc --noEmit
  ```
