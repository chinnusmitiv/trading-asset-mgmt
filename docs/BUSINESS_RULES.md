# Business Rules & Financial Invariants

This document formalizes all business logic, financial calculations, state transitions, and audit constraints for the Asset Management platform.

---

## 1. Core Financial Formulas

### 1.1 Trade P&L, Staff Share & Company Share
For every trade executed by a staff trader:
1. **Net P&L**:
   $$\text{Net P\&L} = \text{Gross Profit} - \text{Gross Loss}$$
2. **Staff Share** (Profit cut):
   $$\text{Staff Share} = \begin{cases} \text{Net P\&L} \times \left(\frac{\text{applied\_percentage}}{100}\right) & \text{if } \text{Net P\&L} > 0 \\ 0 & \text{if } \text{Net P\&L} \le 0 \end{cases}$$
3. **Company Share**:
   $$\text{Company Share} = \text{Net P\&L} - \text{Staff Share}$$
4. **Trade ROI %**:
   $$\text{ROI \%} = \left(\frac{\text{Net P\&L}}{\text{Capital Used}}\right) \times 100$$

> [!IMPORTANT]
> **Historical Rate Invariance**: When a trade is created, `applied_percentage` is permanently captured from the staff member's active profile or policy at that exact moment. Future changes to a staff member's percentage will **never** alter historical trade distributions.

---

### 1.2 Investor Monthly Return & Outstanding Principal
For each investment tranche:
1. **Monthly Expected Return (INR)**:
   $$\text{Monthly Return} = \text{Principal Amount} \times \left(\frac{\text{Return Percentage}}{100}\right)$$
2. **Outstanding Principal**:
   $$\text{Outstanding Principal} = \text{Total Initial Principal} - \text{Principal Repaid}$$
3. **Total Payment Amount**:
   $$\text{Total Amount} = \text{Principal Amount} + \text{Profit Amount} + \text{Other Amount}$$

---

### 1.3 Staff Monthly Net Salary
For payroll disbursements:
$$\text{Net Salary} = \text{Basic Salary} + \text{Allowance} + \text{Bonus} + \text{Commission} - \text{Deduction} - \text{Advance}$$

---

### 1.4 Company Net Profit
Monthly company-wide bottom-line calculation:
$$\text{Net Company Profit} = (\text{Trading P\&L} + \text{Other Income}) - (\text{Investor Profit Paid} + \text{Staff Commission} + \text{Office Expenses} + \text{Salaries} + \text{Other Expenses})$$

---

### 1.5 Capital Utilization & Win Rate
1. **Capital Utilization %**:
   $$\text{Capital Utilization \%} = \left(\frac{\text{Deployed Capital}}{\text{Total Investor Capital}}\right) \times 100$$
2. **Trading Win Rate %**:
   $$\text{Win Rate \%} = \left(\frac{\text{Winning Trades Count}}{\text{Total Closed Trades Count}}\right) \times 100$$

---

## 2. State Transition Machines

### 2.1 Expense Approval Workflow
```text
[Draft] -> [Submitted] -> [Approved] -> [Paid]
   |            |             |
   +------------+-------------+--------> [Cancelled / Rejected]
```
- **Rules**:
  - `Draft` can only be edited by creator.
  - `Submitted` can be approved/rejected by Manager or Admin.
  - `Approved` can be transitioned to `Paid` by Accountant or Admin upon recording payment reference.
  - `Paid` expenses **cannot** be deleted or reverted to draft; can only be marked `Cancelled` with an audit reason and reversing entry.

---

### 2.2 Salary Processing Workflow
```text
[Draft] -> [Approved] -> [Paid]
   |            |
   +------------+--------> [Cancelled]
```
- **Rules**:
  - Only Admin and HR/Manager can generate and approve salary slips.
  - `Paid` status requires bank reference / UTR.

---

### 2.3 Investor Payment Workflow
```text
[Pending] -> [Approved] -> [Paid]
    |             |
    +-------------+-------> [Cancelled / Reversed]
```
- **Rules**:
  - Once marked `Paid`, the record is locked from standard edits.
  - If a mistake occurred, an explicit `Reversed` action generates an equal compensating reversal record.

---

### 2.4 Trade Lifecycle Workflow
```text
[Draft] -> [Submitted] -> [Reviewed] -> [Settled]
   |            |
   +------------+---------> [Cancelled]
```

---

## 3. Financial Immutability & Audit Logging

Every mutation creates an immutable row in `Audit_Log`:
1. `INVESTOR_CREATED` / `INVESTOR_UPDATED`
2. `INVESTMENT_CREATED` / `INVESTMENT_CLOSED`
3. `PAYMENT_APPROVED` / `PAYMENT_PAID` / `PAYMENT_REVERSED`
4. `TRADE_SUBMITTED` / `TRADE_SETTLED`
5. `EXPENSE_APPROVED` / `EXPENSE_PAID`
6. `SALARY_APPROVED` / `SALARY_PAID`
7. `POLICY_UPDATED`
