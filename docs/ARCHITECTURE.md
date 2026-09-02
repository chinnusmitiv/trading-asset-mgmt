# System Architecture & Technical Design

## 1. High-Level Architecture Overview

The Asset Management Operations platform follows a 3-tier mobile-first architecture designed for maximum financial integrity, security, auditability, and clear separation of concerns.

```text
+-------------------------------------------------------------------------+
|                  React Native Mobile Client (iOS / Android)             |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                 Presentation Layer (Screens & UX)                 |  |
|  |   - Dashboard  - Investors  - Trading  - Staff  - Finance  - More  |  |
|  +-------------------------------------------------------------------+  |
|                                    |                                    |
|  +-------------------------------------------------------------------+  |
|  |               State & Context Management (Auth, RBAC)             |  |
|  +-------------------------------------------------------------------+  |
|                                    |                                    |
|  +-------------------------------------------------------------------+  |
|  |              Domain Logic & Pure Calculation Engine               |  |
|  |  (calculateTradePnL, calculateStaffShare, calculateROI, etc.)     |  |
|  +-------------------------------------------------------------------+  |
|                                    |                                    |
|  +-------------------------------------------------------------------+  |
|  |                  Repository Abstraction Layer                     |  |
|  |   [IInvestorRepo]  [ITradeRepo]  [IFinanceRepo]  [IAuditRepo]     |  |
|  +-------------------------------------------------------------------+  |
|             |                                            |              |
|             v                                            v              |
|  +-----------------------+                    +----------------------+  |
|  | Mock / Offline Repo   |                    | GAS API Client       |  |
|  | (Local / In-Memory)   |                    | (HTTPS JSON Client)  |  |
|  +-----------------------+                    +----------------------+  |
+----------------------------------------------------------|--------------+
                                                           | HTTPS (JSON)
                                                           | Request-ID & Bearer Token
                                                           v
+-------------------------------------------------------------------------+
|                    Google Apps Script (GAS) Web API Layer                |
|                                                                         |
|  - JSON Router (doGet / doPost Dispatcher)                              |
|  - Authentication & RBAC Authorization Middleware                       |
|  - Idempotency Gate (Dedup by request_id)                               |
|  - Business Rule Validation Engine                                      |
|  - Header-based Sheet Repository Layer                                  |
|  - Audit Log Interceptor                                                |
+-------------------------------------------------------------------------+
                               |                                  |
                               v                                  v
+---------------------------------------------+   +-----------------------+
|        Google Sheets (Operational DB)       |   | Google Drive (Docs)   |
|                                             |   |                       |
|  - Users            - Trades                |   | - Agreements          |
|  - Investors        - Staff_Commissions     |   | - KYC Documents       |
|  - Investor_Bank    - Company_Capital       |   | - Bank Proofs         |
|  - Investments      - Company_PnL           |   | - Receipts            |
|  - Investor_Payments- Expenses              |   | - Policies            |
|  - Staff            - Salaries              |   |                       |
|  - Policies         - Audit_Log             |   |                       |
+---------------------------------------------+   +-----------------------+
```

---

## 2. Architectural Principles

1. **Financial Immutability & Ledger Invariants**:
   - Financial mutation history is strictly appended; settled/paid records are never physically deleted or silently overwritten.
   - Reversals, adjustments, and cancellations are recorded as new explicit compensating transactions with audit reasons.
2. **Zero Credentials in Mobile Client**:
   - The React Native mobile client never holds Google credentials, service account private keys, or raw spreadsheet secrets.
   - All client interactions happen via authenticated HTTPS requests using standard session/bearer tokens against the Apps Script Web API.
3. **Repository Pattern for Database Agnosticism**:
   - Screens and domain logic depend exclusively on TypeScript interfaces (`IInvestorRepository`, `ITradeRepository`, `IFinanceRepository`, etc.).
   - Migrating from Google Sheets to PostgreSQL, Supabase, or Firebase requires replacing the repository adapter without changing the UI.
4. **Idempotency on Financial Writes**:
   - Every financial write includes a client-generated UUID `request_id`.
   - The backend checks for duplicate request IDs within an idempotency window, preventing double payments, double trades, or duplicate expense submissions during network retries.
5. **Centralized Deterministic Calculations**:
   - All derived financial metrics (P&L, Staff Share, Net Salary, ROI, Investor Return) are computed by pure functions in the calculation engine on both frontend and backend.
   - Historical transactions snapshot the exact rate, policy, and percentage active at the time of transaction execution.

---

## 3. Data Flow & Mutation Lifecycle

```text
[User Action]
      |
      v
[Client-Side Validation & Policy Lookup]
      |
      v
[Generate Idempotency request_id]
      |
      v
[HTTPS POST to GAS Web App] -> (Header: Authorization, Body: { action, payload, requestId })
      |
      +---> [GAS Router: Auth & Permission Check (RBAC)]
      |           | (Denied -> 403 Forbidden Response)
      |           v
      +---> [GAS Idempotency Check: Was requestId processed?]
      |           | (Yes -> Return cached response immediately)
      |           v
      +---> [GAS Business Validation & Invariant Enforcement]
      |           |
      |           v
      +---> [Header-Mapped Sheet Mutation (Append / Transition)]
      |           |
      |           v
      +---> [Append Audit Log Entry (Actor, Action, Before, After)]
      |           |
      |           v
      +---> [Return Standard JSON Response { success: true, data: ..., requestId }]
      |
      v
[Client Updates Local State & Triggers UI Refresh]
```

---

## 4. Migration Path (Google Sheets -> PostgreSQL / Supabase)

The codebase is engineered with strict clean architecture:

| Component | Google Sheets Layer (MVP) | PostgreSQL / Supabase Migration |
| :--- | :--- | :--- |
| **API Contract** | Action-based JSON dispatcher (`action: "trades.create"`) | REST / GraphQL / RPC matching same request/response contracts |
| **Data Access** | `SheetRepository.gs` (Header-based index mapper) | Prisma / Drizzle / TypeORM / Supabase Client |
| **Client Code** | `AppsScriptRepository.ts` implements `IRepository` | `SupabaseRepository.ts` or `PostgresRepository.ts` implements `IRepository` |
| **UI Components** | **No change required** | **No change required** |

---

## 5. Caching & Performance Strategy

1. **Aggregated Dashboard Query**: Single `dashboard.summary` API endpoint delivers all top-level metrics (Capital, Investors, Trading P&L, Expenses, Net Profit, Alerts) in a single round-trip to avoid Google Sheets quota exhaustion.
2. **Local Read-Cache**: Read-only reference lists (Policies, Users, Staff dropdowns) are cached locally in memory and refreshed on pull-to-refresh or mutation.
3. **Debounced Client Searches**: Instant client-side filtering over paginated dataset to eliminate unnecessary network roundtrips.
