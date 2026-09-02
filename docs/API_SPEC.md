# API Specification & Communication Contract

This document defines the interface between the React Native Mobile Application and the Google Apps Script (GAS) Web API layer.

---

## 1. Transport & Protocol

- **Protocol**: HTTPS
- **Format**: JSON (Request & Response)
- **Authentication**: Bearer Token in `Authorization` HTTP header or payload token
- **Idempotency**: `X-Request-Id` HTTP header and/or `requestId` field in payload for mutations.

---

## 2. Standard Response Envelope

All API endpoints return a uniform JSON envelope:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "requestId": "REQ-7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "timestamp": "2026-09-02T14:45:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "message": "Insufficient permissions to approve salary disbursements",
  "errorCode": "FORBIDDEN_ACTION",
  "requestId": "REQ-7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "timestamp": "2026-09-02T14:45:00.000Z"
}
```

---

## 3. Idempotency Key Handling

For all financial write operations (`payments.markPaid`, `trades.create`, `expenses.create`, `salaries.approve`, etc.):
1. Client generates a UUID v4 `requestId`.
2. The Apps Script backend checks `CacheService` / `Audit_Log` for existing records with this `requestId`.
3. If already processed, the cached response is returned without executing the mutation again.

---

## 4. API Endpoints / Action Catalog

The Google Apps Script Web App uses action dispatching over `POST`:

```json
{
  "action": "module.operation",
  "token": "SESSION_TOKEN_STRING",
  "requestId": "REQ-xxxxx",
  "payload": { ... }
}
```

### 4.1 Authentication & Profile
- `auth.login`: Authenticate username/password; returns user profile, role, permissions, session token.
- `auth.logout`: Invalidate session.
- `auth.currentUser`: Fetch current authenticated user profile.

### 4.2 Dashboard Summary (Aggregated Single Request)
- `dashboard.summary`: Aggregates all KPI cards, trading metrics, capital utilization, pending approvals, and alerts.
  - **Payload**: `{ "period": "2026-09" }`
  - **Response**:
    ```json
    {
      "period": "2026-09",
      "capital": {
        "total": 50000000,
        "deployed": 32000000,
        "available": 18000000,
        "utilizationPercentage": 64.0
      },
      "investors": {
        "activeCount": 24,
        "totalPrincipal": 50000000,
        "profitPaidMonth": 1250000,
        "pendingPaymentsCount": 2
      },
      "trading": {
        "monthlyPnL": 2850000,
        "monthlyROI": 8.91,
        "totalTrades": 48,
        "winRate": 68.75
      },
      "finance": {
        "expensesMonth": 350000,
        "salariesMonth": 550000,
        "staffCommissionMonth": 570000,
        "netCompanyProfitMonth": 130000
      },
      "alerts": [
        { "id": "ALT-1", "type": "warning", "title": "2 Pending Investor Payments", "actionRoute": "Payments" },
        { "id": "ALT-2", "type": "info", "title": "1 Expense Awaiting Approval", "actionRoute": "Expenses" }
      ]
    }
    ```

### 4.3 Investors & Investments
- `investors.list`: List investors with optional filters (`status`, `search`, `page`, `limit`).
- `investors.get`: Get investor details with bank info, tranches, payments, documents.
- `investors.create`: Create investor profile.
- `investors.update`: Update contact/metadata.
- `investments.create`: Create new investment tranche.
- `payments.list`: List payment transactions.
- `payments.create`: Generate scheduled/manual payment record.
- `payments.approve`: Manager/Admin approve payment.
- `payments.markPaid`: Record actual bank disbursement (generates audit log).
- `payments.reverse`: Create compensating reversal with mandatory reason.

### 4.4 Staff & Trading
- `staff.list`: List staff members with roles and trading cut rates.
- `staff.get`: Get staff profile, recent trades, monthly commission.
- `staff.create` / `staff.update`: Manage staff details.
- `trades.list`: List trades with filters (`staffId`, `dateRange`, `status`).
- `trades.create`: Enter trade (`capital_used`, `gross_profit`, `gross_loss`, `asset`).
- `trades.submit` / `trades.review` / `trades.settle`: Trade workflow transitions.
- `commissions.list`: List staff commission records.
- `commissions.calculate`: Reconcile monthly commission based on settled trades.

### 4.5 Finance, Expenses & Salaries
- `capital.summary`: Fetch capital breakdown (Deployed, Available, Reserved, Withdrawn).
- `pnl.summary`: Fetch full company P&L statement for month/quarter/year.
- `expenses.list`: Filter expenses by category, date range, status.
- `expenses.create`: Submit new expense.
- `expenses.approve`: Manager/Admin approve expense.
- `expenses.markPaid`: Mark expense as disbursed.
- `salaries.list`: List payroll records.
- `salaries.create`: Generate monthly salary slip.
- `salaries.approve`: Approve payroll.
- `salaries.markPaid`: Confirm salary payment.

### 4.6 Audit Logs & Settings
- `audit.list`: Paginated query over `Audit_Log` with filters (`module`, `userId`, `dateRange`).
- `settings.get`: Retrieve key-value business configurations.
- `settings.update`: Update configuration setting (Admin only).

---

## 5. Error Codes

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN_ACTION` | 403 | User role lacks required permission |
| `INVALID_INPUT` | 400 | Payload schema validation failed |
| `RECORD_NOT_FOUND` | 404 | Entity ID does not exist |
| `DUPLICATE_REQUEST` | 409 | Idempotency conflict (already processing/processed) |
| `INVALID_TRANSITION`| 422 | Illegal state transition (e.g. `Paid` -> `Draft`) |
| `INTERNAL_ERROR` | 500 | Server error (sanitized message returned) |
