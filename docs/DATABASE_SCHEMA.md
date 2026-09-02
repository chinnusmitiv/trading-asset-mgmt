# Database Schema & Google Sheets Specification

This document defines the 17 operational tables (tabs) for the Google Sheets database, including header names, types, constraints, relational foreign keys, and ID strategies.

---

## 1. Unique ID Generation Strategy

All entities use standardized, immutable, prefixed sequential/cryptographic IDs. IDs must never be reused or changed.

| Entity | Prefix | Example ID |
| :--- | :--- | :--- |
| **User** | `USR-` | `USR-00001` |
| **Investor** | `INV-` | `INV-00001` |
| **Investor Bank** | `BNK-` | `BNK-00001` |
| **Investment** | `INVEST-` | `INVEST-00001` |
| **Investor Payment** | `PAY-` | `PAY-00001` |
| **Investor Document** | `IDOC-` | `IDOC-00001` |
| **Staff** | `STAFF-` | `STAFF-00001` |
| **Trade** | `TRD-` | `TRD-00001` |
| **Staff Commission** | `COMM-` | `COMM-00001` |
| **Company Capital** | `CAP-` | `CAP-00001` |
| **Company PnL** | `PNL-` | `PNL-00001` |
| **Expense** | `EXP-` | `EXP-00001` |
| **Salary** | `SAL-` | `SAL-00001` |
| **Policy** | `POL-` | `POL-00001` |
| **Document** | `DOC-` | `DOC-00001` |
| **Audit Log** | `AUD-` | `AUD-00001` |
| **Setting** | `SET-` | `SET-00001` |

---

## 2. Table Definitions

### 1. `Users`
Stores authorized app operators, login credentials/hashes, and RBAC roles.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | STRING (PK) | Unique | `USR-xxxxx` |
| `username` | STRING | Unique, Required | Login identifier / email |
| `password_hash` | STRING | Required | SHA-256 salted hash |
| `full_name` | STRING | Required | Operator's name |
| `email` | STRING | Required | Contact email |
| `role` | ENUM | `Admin`, `Manager`, `Staff` | Role for RBAC |
| `staff_id` | STRING (FK) | Nullable -> `Staff.staff_id` | Linked staff member |
| `status` | ENUM | `Active`, `Inactive`, `Suspended` | Account status |
| `created_at` | ISO-8601 | Required | Record timestamp |
| `updated_at` | ISO-8601 | Required | Last update timestamp |

---

### 2. `Investors`
Core profile of capital providers.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `investor_id` | STRING (PK) | Unique | `INV-xxxxx` |
| `name` | STRING | Required | Full legal name |
| `phone` | STRING | Required | Primary phone |
| `email` | STRING | Optional | Email address |
| `address` | STRING | Optional | Residential address |
| `joining_date` | YYYY-MM-DD | Required | Onboarding date |
| `status` | ENUM | `Active`, `Inactive`, `Suspended` | Current status |
| `notes` | STRING | Optional | Internal remarks |
| `created_at` | ISO-8601 | Required | Timestamp |
| `updated_at` | ISO-8601 | Required | Timestamp |

---

### 3. `Investor_Bank`
Masked bank account records for payouts.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `bank_id` | STRING (PK) | Unique | `BNK-xxxxx` |
| `investor_id` | STRING (FK) | Required -> `Investors` | Associated investor |
| `account_holder_name`| STRING | Required | Legal name on account |
| `bank_name` | STRING | Required | Financial institution name |
| `account_number_masked`| STRING | Required | e.g. `XXXX XXXX 4582` |
| `ifsc_code` | STRING | Required | Routing / IFSC code |
| `account_type` | ENUM | `Savings`, `Current` | Account type |
| `is_primary` | BOOLEAN | Required | Default payout destination |
| `created_at` | ISO-8601 | Required | Timestamp |

---

### 4. `Investments`
Specific capital allocation tranches.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `investment_id` | STRING (PK) | Unique | `INVEST-xxxxx` |
| `investor_id` | STRING (FK) | Required -> `Investors` | Owner of investment |
| `principal_amount`| NUMBER | >= 0 | Capital invested (INR) |
| `investment_date`| YYYY-MM-DD | Required | Date funds deposited |
| `maturity_date` | YYYY-MM-DD | Optional | Lock-in expiration date |
| `return_percentage`| NUMBER | >= 0 (e.g. 2.5 for 2.5%/mo)| Agreed monthly return % |
| `monthly_return` | NUMBER | >= 0 | Derived: `principal * (return % / 100)` |
| `payment_frequency`| ENUM | `Monthly`, `Quarterly`, `Annual`, `On_Maturity` | Payout interval |
| `policy_id` | STRING (FK) | Optional -> `Policies` | Policy reference at creation |
| `status` | ENUM | `Active`, `Matured`, `Closed`, `Suspended` | Lifecycle status |
| `notes` | STRING | Optional | Internal notes |
| `created_at` | ISO-8601 | Required | Creation timestamp |
| `updated_at` | ISO-8601 | Required | Update timestamp |
| `created_by` | STRING (FK) | Required -> `Users` | Operator ID |

---

### 5. `Investor_Payments`
Disbursement history (profit payout / principal withdrawal).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `payment_id` | STRING (PK) | Unique | `PAY-xxxxx` |
| `investor_id` | STRING (FK) | Required -> `Investors` | Recipient investor |
| `investment_id` | STRING (FK) | Required -> `Investments` | Associated tranche |
| `payment_date` | YYYY-MM-DD | Required | Transaction date |
| `payment_month` | YYYY-MM | Required | Billing cycle (e.g. `2026-08`) |
| `principal_amount`| NUMBER | >= 0 | Principal returned |
| `profit_amount` | NUMBER | >= 0 | Profit/interest distributed |
| `other_amount` | NUMBER | >= 0 | Adjustments or bonuses |
| `total_amount` | NUMBER | `>= 0` (Formula: `principal + profit + other`) | Total transferred |
| `payment_method` | ENUM | `Bank_Transfer`, `UPI`, `Cheque`, `Cash` | Payout rail |
| `payment_reference`| STRING | Optional | UTR / Transaction reference |
| `status` | ENUM | `Pending`, `Approved`, `Paid`, `Failed`, `Cancelled`, `Reversed` | Payout state |
| `notes` | STRING | Optional | Remarks |
| `created_at` | ISO-8601 | Required | Timestamp |
| `created_by` | STRING (FK) | Required -> `Users` | Operator ID |

---

### 6. `Investor_Documents` & `Documents`
Metadata records pointing to files secured on Google Drive.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `document_id` | STRING (PK) | Unique | `DOC-xxxxx` / `IDOC-xxxxx` |
| `entity_type` | ENUM | `Investor`, `Staff`, `Company`, `Expense` | Owning entity |
| `entity_id` | STRING | Required | Associated Entity ID |
| `document_type` | ENUM | `Agreement`, `KYC`, `Bank_Proof`, `Policy`, `Receipt`, `Other` | Classification |
| `document_name` | STRING | Required | Display title |
| `drive_file_id` | STRING | Required | Google Drive File ID |
| `drive_url` | STRING | Required | Google Drive HTTPS URL |
| `uploaded_date` | YYYY-MM-DD | Required | Upload date |
| `expiry_date` | YYYY-MM-DD | Optional | Document expiration |
| `status` | ENUM | `Valid`, `Expiring`, `Expired`, `Revoked` | Status |
| `created_by` | STRING (FK) | Required -> `Users` | Operator ID |

---

### 7. `Staff`
Traders and administrative personnel.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `staff_id` | STRING (PK) | Unique | `STAFF-xxxxx` |
| `name` | STRING | Required | Full legal name |
| `phone` | STRING | Required | Contact phone |
| `email` | STRING | Required | Corporate email |
| `role` | ENUM | `Trader`, `Manager`, `Accountant`, `Support` | Operational role |
| `department` | STRING | Required | Team / Division |
| `joining_date` | YYYY-MM-DD | Required | Hire date |
| `basic_salary` | NUMBER | >= 0 | Base monthly compensation |
| `trading_percentage`| NUMBER | 0 to 100 | Default profit cut (e.g. 20%) |
| `commission_percentage`| NUMBER| 0 to 100 | Volume or deal commission % |
| `status` | ENUM | `Active`, `Inactive`, `On_Leave` | Employment status |
| `bank_details_reference`| STRING | Optional | Masked account reference |
| `notes` | STRING | Optional | Internal remarks |
| `created_at` | ISO-8601 | Required | Timestamp |
| `updated_at` | ISO-8601 | Required | Timestamp |

---

### 8. `Trades`
Individual trading transactions and performance outcomes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `trade_id` | STRING (PK) | Unique | `TRD-xxxxx` |
| `staff_id` | STRING (FK) | Required -> `Staff` | Trader responsible |
| `trade_date` | YYYY-MM-DD | Required | Trade execution date |
| `asset` | STRING | Required | e.g. `NIFTY_FUT`, `BANKNIFTY`, `RELIANCE` |
| `trade_type` | ENUM | `BUY`, `SELL`, `INTRADAY`, `SWING`, `OPTION` | Execution category |
| `capital_used` | NUMBER | >= 0 | Margin / Capital allocated |
| `entry_price` | NUMBER | >= 0 | Average entry price |
| `exit_price` | NUMBER | >= 0 | Average exit price |
| `quantity` | NUMBER | > 0 | Contract / Share volume |
| `gross_profit` | NUMBER | >= 0 | Positive earnings |
| `gross_loss` | NUMBER | >= 0 | Losses incurred |
| `net_pnl` | NUMBER | Formula: `gross_profit - gross_loss` | Realized outcome |
| `applied_percentage`| NUMBER | 0 to 100 | Snapshot staff rate at trade time |
| `staff_share` | NUMBER | Formula: `max(0, net_pnl * (applied_percentage/100))` | Staff payout |
| `company_share`| NUMBER | Formula: `net_pnl - staff_share` | Company profit retained |
| `roi_percentage`| NUMBER| Formula: `(net_pnl / capital_used) * 100` | Capital return % |
| `status` | ENUM | `Draft`, `Submitted`, `Reviewed`, `Settled` | Trade state |
| `notes` | STRING | Optional | Strategy / notes |
| `created_at` | ISO-8601 | Required | Timestamp |
| `created_by` | STRING (FK) | Required -> `Users` | Operator ID |

---

### 9. `Staff_Commissions`
Reconciled commission records for payroll.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `commission_id` | STRING (PK) | Unique | `COMM-xxxxx` |
| `staff_id` | STRING (FK) | Required -> `Staff` | Staff beneficiary |
| `trade_id` | STRING (FK) | Optional -> `Trades` | Originating trade |
| `commission_period`| YYYY-MM | Required | Billing cycle |
| `base_amount` | NUMBER | >= 0 | Base P&L or volume amount |
| `applied_percentage`| NUMBER | 0 to 100 | Percentage applied |
| `commission_amount`| NUMBER | >= 0 | Calculated commission (INR) |
| `status` | ENUM | `Calculated`, `Approved`, `Paid`, `Cancelled` | Status |
| `created_at` | ISO-8601 | Required | Timestamp |
| `approved_at` | ISO-8601 | Optional | Approval timestamp |
| `paid_at` | ISO-8601 | Optional | Payout timestamp |

---

### 10. `Company_Capital`
Historical capital movements (Deposits, Allocations, Reserves, Withdrawals).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `capital_id` | STRING (PK) | Unique | `CAP-xxxxx` |
| `date` | YYYY-MM-DD | Required | Snapshot / transaction date |
| `total_investor_capital`| NUMBER | >= 0 | Total cumulative principal |
| `deployed_capital`| NUMBER | >= 0 | Capital actively in trading |
| `available_capital`| NUMBER | >= 0 | Unallocated liquid cash |
| `reserved_capital`| NUMBER | >= 0 | Held for upcoming payouts |
| `withdrawn_capital`| NUMBER| >= 0 | Principal returned to investors |
| `notes` | STRING | Optional | Reconciliation remarks |
| `created_at` | ISO-8601 | Required | Timestamp |

---

### 11. `Company_PnL`
Monthly reconciled company financial summary.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `pnl_id` | STRING (PK) | Unique | `PNL-xxxxx` |
| `period` | YYYY-MM | Required | Fiscal month |
| `trading_pnl` | NUMBER | Net trading result | Sum of Trades `net_pnl` |
| `other_income` | NUMBER | >= 0 | Non-trading revenues |
| `investor_profit_paid`| NUMBER| >= 0 | Payouts to investors |
| `staff_commission`| NUMBER| >= 0 | Commission paid |
| `office_expenses` | NUMBER | >= 0 | Total verified operational expenses |
| `salaries` | NUMBER | >= 0 | Total verified staff salaries |
| `other_expenses` | NUMBER | >= 0 | Sundry expenses |
| `net_company_profit`| NUMBER | Invariant formula: `(trading_pnl + other_income) - (investor_profit_paid + staff_commission + office_expenses + salaries + other_expenses)` | Net bottom line |
| `reconciled_at` | ISO-8601 | Required | Snapshot timestamp |

---

### 12. `Expenses`
Office and operational overhead transactions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `expense_id` | STRING (PK) | Unique | `EXP-xxxxx` |
| `expense_date` | YYYY-MM-DD | Required | Incurred date |
| `category` | ENUM | `Rent`, `Electricity`, `Internet`, `Telephone`, `Travel`, `Food`, `Office_Supplies`, `Software`, `Equipment`, `Maintenance`, `Marketing`, `Professional_Fees`, `Other` | Classification |
| `description` | STRING | Required | Line item description |
| `amount` | NUMBER | > 0 | Cost in INR |
| `payment_method`| ENUM | `Bank_Transfer`, `UPI`, `Credit_Card`, `Cash`, `Cheque` | Payment rail |
| `paid_by` | STRING | Optional | Employee or entity who paid |
| `vendor` | STRING | Optional | Vendor / Payee name |
| `receipt_url` | STRING | Optional | Google Drive receipt link |
| `status` | ENUM | `Draft`, `Submitted`, `Approved`, `Paid`, `Rejected`, `Cancelled` | Workflow state |
| `notes` | STRING | Optional | Remarks |
| `created_at` | ISO-8601 | Required | Timestamp |
| `created_by` | STRING (FK) | Required -> `Users` | Creator |
| `approved_at` | ISO-8601 | Optional | Approval timestamp |
| `approved_by` | STRING (FK) | Optional -> `Users` | Approver |

---

### 13. `Salaries`
Staff payroll monthly disbursements.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `salary_id` | STRING (PK) | Unique | `SAL-xxxxx` |
| `staff_id` | STRING (FK) | Required -> `Staff` | Employee |
| `salary_month` | YYYY-MM | Required | Payroll period |
| `basic_salary` | NUMBER | >= 0 | Base pay |
| `allowance` | NUMBER | >= 0 | Additional allowances |
| `bonus` | NUMBER | >= 0 | Performance bonus |
| `commission` | NUMBER | >= 0 | Trade commissions included |
| `deduction` | NUMBER | >= 0 | Tax / deductions |
| `advance` | NUMBER | >= 0 | Salary advances recovered |
| `net_salary` | NUMBER | Formula: `basic + allowance + bonus + commission - deduction - advance` | Payable payout |
| `payment_date` | YYYY-MM-DD | Optional | Disbursement date |
| `payment_status`| ENUM | `Draft`, `Approved`, `Paid`, `Cancelled` | Status |
| `payment_reference`| STRING | Optional | Bank transfer reference |
| `notes` | STRING | Optional | Remarks |
| `created_at` | ISO-8601 | Required | Timestamp |
| `created_by` | STRING (FK) | Required -> `Users` | Creator |
| `approved_at` | ISO-8601 | Optional | Approval timestamp |
| `approved_by` | STRING (FK) | Optional -> `Users` | Approver |

---

### 14. `Policies`
Versioned business policies.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `policy_id` | STRING (PK) | Unique | `POL-xxxxx` |
| `policy_name` | STRING | Required | e.g. `Default Trader Profit Cut` |
| `description` | STRING | Optional | Policy details |
| `value` | NUMBER | Required | Numeric parameter (e.g. 20, 2.5) |
| `unit` | STRING | Required | `%`, `Days`, `INR` |
| `effective_from`| YYYY-MM-DD | Required | Start date |
| `effective_until`| YYYY-MM-DD| Optional | Deprecation date |
| `status` | ENUM | `Active`, `Archived`, `Draft` | Status |
| `version` | STRING | Required | e.g. `v1.0`, `v1.1` |
| `created_at` | ISO-8601 | Required | Timestamp |
| `created_by` | STRING (FK) | Required -> `Users` | Creator |

---

### 15. `Audit_Log`
Immutable system-wide event trail.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `audit_id` | STRING (PK) | Unique | `AUD-xxxxx` |
| `timestamp` | ISO-8601 | Required | Event timestamp |
| `user_id` | STRING (FK) | Required -> `Users` | Actor |
| `action` | STRING | Required | e.g. `PAYMENT_PAID`, `TRADE_CREATED` |
| `module` | ENUM | `Investors`, `Trading`, `Staff`, `Finance`, `Expenses`, `Salaries`, `Policies`, `Auth` | Domain area |
| `record_id` | STRING | Required | Target entity ID |
| `old_value` | JSON_STRING | Optional | State before modification |
| `new_value` | JSON_STRING | Optional | State after modification |
| `reason` | STRING | Optional | Required for adjustments/reversals |

---

### 16. `Settings`
Key-value application configurations.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `setting_id` | STRING (PK) | Unique | `SET-xxxxx` |
| `key` | STRING | Unique, Required | e.g. `CURRENCY_CODE`, `DEFAULT_TIMEZONE` |
| `value` | STRING | Required | e.g. `INR`, `Asia/Kolkata` |
| `description` | STRING | Optional | Explanation |
| `updated_at` | ISO-8601 | Required | Timestamp |
| `updated_by` | STRING (FK) | Required -> `Users` | Operator |
