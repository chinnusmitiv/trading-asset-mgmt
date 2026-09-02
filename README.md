# 📈 Asset Management Operations Platform

A production-grade, enterprise financial management and proprietary trading operations platform built with **React Native / Expo** and powered by **Google Sheets & Google Apps Script (GAS)** backend.

---

## 📑 Table of Contents
1. [Key Features & Modules](#key-features--modules)
2. [Google Sheets Backend Setup (Live Database)](#-google-sheets-backend-setup-live-database)
3. [Running the Mobile App Locally](#-running-the-mobile-app-locally)
4. [Demo Credentials (Mock Mode)](#-demo-credentials-mock-mode)
5. [Automated Tests & Quality Checks](#-automated-tests--quality-checks)
6. [Core Financial Invariants & Formulas](#-core-financial-invariants--formulas)
7. [Project Structure](#-project-structure)

---

## 🌟 Key Features & Modules

- **👥 Investor Management Hub**:
  - 5-tab Portfolio inspector (Overview, Investments, Payment History, Bank Details, Signed Documents).
  - Multi-tranche capital allocations with real-time monthly return calculations.
  - Payment disbursement tracking with duplicate protection (`requestId`) and audit-logged reversals.
  - Strict bank account number masking (`XXXX XXXX 4582`).

- **📈 Proprietary Trading Operations**:
  - Live trade execution logging (Intraday, Swing, Futures, Options) with auto-calculated Net P&L.
  - **Historical Rate Locking**: Freezes trader cut and investor payout rates at transaction time.
  - Review & Settle workflow with automated trader commission ledger generation.

- **💰 Finance, Expenses & Staff Payroll**:
  - 13 Operational expense categories with 2-step approval lifecycle (`Pending` -> `Approved` -> `Paid`).
  - Automated staff payroll slip generator with live Net Salary auto-calc ($Net = Basic + Allowance + Bonus + Commission - Deductions$).
  - **Executive Company Net Profit Engine**: Real-time consolidated monthly P&L.

- **🛡️ Security, Offline Sync & Audit Trails**:
  - Offline mutation queue preserving unique `requestId`s for zero-loss background syncing.
  - Real-time **Sync Status Banner** in app headers (`Online`, `Offline Mode`, `Syncing`).
  - Immutable **Audit Trail & JSON Diff Inspector** showing exact before/after state changes.
  - Zero-Credential mobile architecture: zero Google Cloud API keys or secrets stored in client bundle.

---

## 📊 Google Sheets Backend Setup (Live Database)

Follow these steps to connect your mobile app to a live Google Spreadsheet:

### Step 1: Create a Google Sheet
1. Navigate to **[sheets.new](https://sheets.new)** in your browser.
2. Name the spreadsheet: **`Asset Management Operations Database`**.

### Step 2: Open Google Apps Script Editor
1. In the Google Sheet top menu, click **Extensions** → **Apps Script**.
2. Rename the project to `Asset Management API`.

### Step 3: Copy Project Backend Scripts
Create the following `.gs` files in the Apps Script editor and copy the contents from the `backend/google-apps-script/` directory:

| Script File in Apps Script | Source File in Repository | Purpose |
|---|---|---|
| `SetupSheets.gs` | [`backend/google-apps-script/SetupSheets.gs`](backend/google-apps-script/SetupSheets.gs) | Auto-generates all 17 database tabs with column validations |
| `SheetRepository.gs` | [`backend/google-apps-script/SheetRepository.gs`](backend/google-apps-script/SheetRepository.gs) | Low-level CRUD and sheet querying operations |
| `Idempotency.gs` | [`backend/google-apps-script/Idempotency.gs`](backend/google-apps-script/Idempotency.gs) | Deduplication engine using client `requestId` |
| `AuditService.gs` | [`backend/google-apps-script/AuditService.gs`](backend/google-apps-script/AuditService.gs) | Immutable audit logging for all mutations |
| `ApiRouter.gs` | [`backend/google-apps-script/ApiRouter.gs`](backend/google-apps-script/ApiRouter.gs) | REST-like action dispatch router |
| `Code.gs` | [`backend/google-apps-script/Code.gs`](backend/google-apps-script/Code.gs) | HTTP `doPost` / `doGet` gateway entrypoint |
| `SeedData.gs` | [`backend/google-apps-script/SeedData.gs`](backend/google-apps-script/SeedData.gs) | Initial seed generator (Admin users, sample portfolio) |

### Step 4: Run Initial Sheet Generator
1. In the Apps Script toolbar dropdown, select the function **`seedDevelopmentData`** (or `setupAllSheets`).
2. Click **Run ▶️** and grant Google account authorizations when prompted.
3. Switch to your Google Sheet to verify all **17 relational sheets** (`Users`, `Investors`, `Investments`, `InvestorPayments`, `Trades`, `Staff`, `Expenses`, `Salaries`, `AuditLog`, etc.) are created and populated.

### Step 5: Deploy as Web App
1. In the top-right corner of Apps Script, click **Deploy** → **New deployment**.
2. Click the gear icon ⚙️ → select **Web app**.
3. Configure settings:
   - **Description**: `Asset Management API v1.0`
   - **Execute as**: `Me (your Google account)`
   - **Who has access**: `Anyone` *(required for mobile client requests)*
4. Click **Deploy** and copy your **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 6: Connect Mobile App
1. Open the mobile app → Navigate to **More** → **Settings & Config**.
2. Turn **OFF** `Offline Mock Development Mode`.
3. In **Google Apps Script Web App URL**, paste your copied Web App URL.
4. Tap **Save Configurations**.

---

## 🚀 Running the Mobile App Locally

### Prerequisites
- Node.js (v18 or v20+)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/chinnusmitiv/trading-asset-mgmt.git
cd trading-asset-mgmt

# Install dependencies
npm install --legacy-peer-deps
```

### Start Expo Bundler
```bash
# Start development server
npx expo start -c
# OR
npm start
```

### Keybindings in Terminal:
- Press **`i`** → Open **iOS Simulator** (macOS with Xcode)
- Press **`a`** → Open **Android Emulator** (Android Studio)
- Press **`w`** → Open in **Web Browser**
- Scan QR code with the **Expo Go** app on a physical iOS/Android phone

---

## 🔑 Demo Credentials (Mock Mode)

When `Offline Mock Development Mode` is enabled in Settings, use the following logins:

| Role | Username | Password | Permissions |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Unrestricted full access to all modules, financial ledgers, and audit logs |
| **Desk Manager** | `manager` | `manager123` | Trade review/settling, investor approvals, operational expenses |
| **Prop Trader** | `trader1` | `trader123` | Trade execution entry, personal commission ledger, own portfolio |

---

## 🧪 Automated Tests & Quality Checks

Run the 100% passing test suite covering financial invariants, RBAC matrices, and offline sync queue:

```bash
# Run all Jest unit & integration tests
npm test

# Run TypeScript static type checker
npx tsc --noEmit
```

### Test Coverage Summary:
- `__tests__/sync_and_security.test.ts`: Offline mutation queue, idempotency, data masking, and RBAC matrix.
- `__tests__/finance_module.test.ts`: Expense 2-step approvals, Net Salary invariant, and Company Net Profit aggregation.
- `__tests__/trading_module.test.ts`: Trade P&L splits, rate locking, settlements, and commissions.
- `__tests__/investor_module.test.ts`: Multi-tranche return sums, payment totals, and bank masking.
- `__tests__/calculations.test.ts`: Pure financial calculations engine.
- `__tests__/rbac.test.ts`: Permission evaluation across Admin, Manager, Staff.
- `__tests__/repository.test.ts`: Repository operations and deduplication.

---

## 📐 Core Financial Invariants & Formulas

1. **Investor Monthly Return Calculation**:
   $$\text{Monthly Expected Return} = \text{Principal Amount} \times \left(\frac{\text{Agreed Return Percentage}}{100}\right)$$

2. **Trader Gross & Net P&L**:
   $$\text{Gross P\&L} = (\text{Exit Price} - \text{Entry Price}) \times \text{Quantity}$$
   $$\text{Staff Share} = \max(0, \text{Net P\&L} \times \text{Locked Staff Rate})$$

3. **Staff Net Salary**:
   $$\text{Net Salary} = \text{Basic Salary} + \text{Allowances} + \text{Bonuses} + \text{Commissions} - \text{Deductions} - \text{Advances}$$

4. **Company Consolidated Net Profit**:
   $$\text{Company Net Profit} = \text{Trading Net P\&L} - \text{Investor Returns Paid} - \text{Operating Expenses} - \text{Staff Payroll}$$

---

## 📁 Project Structure

```text
trading-asset-mgmt/
├── assets/                    # App icons, splash screens, favicon
├── backend/
│   └── google-apps-script/    # Google Apps Script database backend
│       ├── SetupSheets.gs     # Sheet structure & validation setup
│       ├── SheetRepository.gs # Sheet CRUD operations
│       ├── Idempotency.gs     # Client requestId deduplication
│       ├── AuditService.gs    # Immutable audit logging
│       ├── ApiRouter.gs       # Action request router
│       ├── Code.gs            # Web App doPost/doGet entry
│       └── SeedData.gs        # Seed dataset
├── src/
│   ├── components/            # UI components (KpiCard, FinancialCard, AppHeader, SyncStatusBanner, etc.)
│   ├── constants/             # Theme tokens, colors, typography, permissions
│   ├── navigation/            # Root stack and Tab navigators
│   ├── repositories/          # MockRepository & AppsScriptRepository
│   ├── screens/
│   │   ├── auth/              # LoginScreen
│   │   ├── dashboard/         # Executive DashboardScreen
│   │   ├── investors/         # InvestorProfileScreen, AddInvestor, AddInvestment, RecordPayment, AddBank
│   │   ├── trading/           # TradingDashboardScreen, AddTrade, TradeDetails
│   │   ├── staff/             # StaffListScreen, StaffDetails, AddStaff, StaffCommissions
│   │   ├── finance/           # FinanceDashboardScreen, AddExpense, ExpenseDetails, ProcessPayroll, PayrollList, SalaryDetails
│   │   ├── audit/             # AuditLogScreen with JSON Diff Inspector
│   │   ├── settings/          # SettingsScreen with Offline Sync controls
│   │   └── more/              # MoreMenuScreen
│   ├── services/              # API Client, Auth Service, Sync Service
│   ├── store/                 # AuthContext, SettingsContext, SyncContext
│   ├── types/                 # TypeScript domain interfaces and DTOs
│   └── utils/                 # Financial calculations, currency formatting, masking, date formatting
├── __tests__/                 # Comprehensive Jest test suites
├── App.tsx                    # Main application root
├── app.json                   # Expo configuration
├── package.json               # Dependencies & scripts
└── tsconfig.json              # TypeScript configuration
```

---

## 📄 License
Private & Confidential — Proprietary Asset Management & Trading Operations.
