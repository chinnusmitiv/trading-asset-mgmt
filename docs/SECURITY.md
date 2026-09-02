# Security Architecture & RBAC Matrix

## 1. Zero Mobile Credentials Principle

Under no circumstances are Google Service Account keys, OAuth Client Secrets, private API tokens, or raw Google Sheets database IDs embedded inside the client-side React Native application binary.

Communication is strictly restricted to authenticated HTTPS calls against the Google Apps Script Web App gateway using ephemeral session tokens.

---

## 2. Role-Based Access Control (RBAC)

The system enforces three primary roles: **Admin**, **Manager**, and **Staff**.

### RBAC Permission Matrix

| Capability / Module | Admin | Manager | Staff |
| :--- | :---: | :---: | :---: |
| **View Executive Dashboard** | ✅ Full | ✅ Full | ❌ Restricted (Personal Only) |
| **Manage Users & System Roles** | ✅ Full | ❌ Denied | ❌ Denied |
| **Create / Edit Investors** | ✅ Full | ✅ Full | ❌ Denied |
| **View Masked Bank Details** | ✅ Full | ✅ Masked | ❌ Denied |
| **View Unmasked Full Account** | ✅ Admin Only | ❌ Denied | ❌ Denied |
| **Create Investments** | ✅ Full | ✅ Full | ❌ Denied |
| **Approve / Mark Payments Paid** | ✅ Full | ✅ Full | ❌ Denied |
| **Reverse Financial Payments** | ✅ Full | ❌ Denied | ❌ Denied |
| **View Staff Performance & Rates**| ✅ All Staff | ✅ All Staff | ❌ Own Performance Only |
| **Create Trades** | ✅ Full | ✅ Full | ✅ Own Trades Only |
| **Review & Settle Trades** | ✅ Full | ✅ Full | ❌ Denied |
| **Submit Expense** | ✅ Full | ✅ Full | ✅ Own Expenses |
| **Approve Expense** | ✅ Full | ✅ Full | ❌ Denied |
| **View / Process Salaries** | ✅ All Staff | ❌ Denied | ❌ Own Salary Only |
| **Modify Business Policies** | ✅ Full | ❌ Denied | ❌ Denied |
| **View Full Audit Log** | ✅ Full | ❌ Denied | ❌ Denied |
| **Access System Settings** | ✅ Full | ❌ Denied | ❌ Denied |

---

## 3. Dual Enforcement (Client & Server)

UI hiding is for user experience, not security.
- **Client Side**: Screens, tabs, and action buttons conditionally render based on the user's role capabilities.
- **Server Side**: Every GAS Web API action executes `assertPermission(user, requiredCapability)` before reading or writing any sheet data. Unauthorized requests are rejected with `403 FORBIDDEN_ACTION`.

---

## 4. Sensitive Data Masking

Financial and identity numbers are masked across the UI and regular API payloads:
- Bank Account Numbers: `XXXX XXXX 4582` (only last 4 digits visible).
- Phone Numbers: Masked on non-admin screens if required.
- Passwords: Never stored in plaintext; hashed via SHA-256 with salt.

---

## 5. Audit Logging Standards

The `Audit_Log` tab records every state modification:
- **Never Logged**: Plaintext passwords, raw tokens, full unmasked account credentials.
- **Always Logged**: Actor User ID, timestamp, module, action name, record ID, snapshot of changed fields (`old_value`, `new_value`), and mandatory reason for financial reversals.
