# Product Implementation Roadmap

```text
+-------------------------------------------------------------------------------+
| PHASE 1: FOUNDATION (CURRENT FOCUS)                                           |
| - Architecture, Schema & Contracts Documentation                              |
| - Google Apps Script Backend (17 Tabs Generator, Sheet Repo, API Router)     |
| - React Native + TypeScript Project Setup & Navigation                        |
| - Fintech Dark Design System & Reusable UI Component Library                  |
| - Auth, RBAC Matrix & Session Store                                           |
| - Pure Financial Calculations Engine with Unit Test Suite                     |
| - Mock / Offline Dev Repository & Seed Dataset                                |
+-------------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------------+
| PHASE 2: INVESTOR MANAGEMENT MODULE                                           |
| - Investor List (Search, Filter by Status, Pagination, Pull-to-refresh)       |
| - Add / Edit Investor Form with duplicate check                               |
| - Investor Profile Hub (Overview, Investments, Payments, Bank, Documents)     |
| - Multi-Tranche Investment Creator & Auto Monthly Return Estimator            |
| - Masked Bank Details Viewer & Editor                                         |
| - Investor Payment Disburser with Confirmation Dialog & Idempotency           |
+-------------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------------+
| PHASE 3: STAFF & TRADING OPERATIONS MODULE                                    |
| - Staff Directory & Trader Role Configuration                                 |
| - Trade Entry Workflow (Capital Used, Gross Profit, Gross Loss, Auto Net P&L)|
| - Historical Percentage Snapshot Enforcement (Staff Share / Company Share)    |
| - Trading Analytics Dashboard (Win Rate, Daily/Monthly P&L, ROI Trends)       |
| - Monthly Staff Commission Calculator & Payroll Integration                   |
+-------------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------------+
| PHASE 4: COMPANY FINANCE, EXPENSES & SALARIES                                 |
| - Company Capital Position (Total, Deployed, Available, Reserved)            |
| - Company P&L Statement Engine (Trading P&L + Income - Expenses - Salaries)   |
| - Multi-Category Office Expense Tracker with Receipt Drive Attachment         |
| - Staff Salary Slip Generator & Net Salary Invariant Enforcement              |
| - Financial Summary Charts & Trends                                           |
+-------------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------------+
| PHASE 5: WORKFLOW CONTROLS & AUDITABILITY                                     |
| - Multi-step Approval State Machines (Expenses, Salaries, Payments)           |
| - Reversal & Compensating Transaction Mechanism with Mandatory Reasons        |
| - System-wide Filterable Audit Log Viewer                                      |
+-------------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------------+
| PHASE 6: REPORTING & DATA EXPORT                                              |
| - Investor Statements & Tax Year Summary Generator                            |
| - Staff Performance & Commission Report                                       |
| - Trading Journal & Strategy Performance Report                               |
| - Company Financial Balance & P&L Export (CSV / PDF ready)                    |
+-------------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------------+
| PHASE 7: ADVANCED OPTIMIZATIONS & NOTIFICATIONS                               |
| - Proactive Alerts (Upcoming Maturities, Document Expirations, Pending Pay)   |
| - Offline Cache Sync & Conflict Resolution                                    |
| - Supabase / PostgreSQL Direct Migration Connector                            |
+-------------------------------------------------------------------------------+
```
