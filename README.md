# 📈 Asset Management Operations Platform

A production-grade, enterprise financial management and proprietary trading operations platform built with **React Native / Expo** and powered by **Google Sheets & Google Apps Script (GAS)** backend.

---

## 📑 Table of Contents
1. [Key Features & Modules](#key-features--modules)
2. [Google Sheets Backend Setup (Live Database)](#-google-sheets-backend-setup-live-database)
3. [Running the Mobile App Locally](#-running-the-mobile-app-locally)
4. [Building Android APK & Release Bundle](#-building-android-apk--release-bundle)
5. [Role-Based Access Control (RBAC) & Login Personas](#-role-based-access-control-rbac--login-personas)
6. [Automated Tests & Quality Checks](#-automated-tests--quality-checks)
7. [Core Financial Invariants & Formulas](#-core-financial-invariants--formulas)
8. [Project Structure](#-project-structure)

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

The mobile application uses a **Google Spreadsheet** as its live relational database and **Google Apps Script (GAS)** as its zero-cost serverless backend API. All data (investors, trades, staff, payroll, audit logs) is stored directly in your own private Google Drive with zero cloud database hosting fees.

Follow these step-by-step instructions to connect your mobile app to a live Google Sheet:

---

### Step 1: Create Your Google Spreadsheet
1. In your web browser, navigate to **[sheets.new](https://sheets.new)** to create a blank spreadsheet.
2. Rename the spreadsheet to: **`Asset Management Operations Database`**.

---

### Step 2: Open Google Apps Script Editor
1. In the Google Sheets top menu bar, click **Extensions** → **Apps Script**.
2. Rename the Apps Script project in the top-left from *Untitled project* to: **`Asset Management API`**.

---

### Step 3: Copy Project Backend Scripts
Create the following **7 script files** in the Apps Script editor (click **+** next to *Files* → select **Script**) and copy the exact contents from the `backend/google-apps-script/` directory of this repo:

| Apps Script File Name | Repository Source File | Purpose |
|---|---|---|
| `SetupSheets.gs` | [`backend/google-apps-script/SetupSheets.gs`](backend/google-apps-script/SetupSheets.gs) | Schema definitions; generates all 17 relational tabs with headers and styles |
| `SheetRepository.gs` | [`backend/google-apps-script/SheetRepository.gs`](backend/google-apps-script/SheetRepository.gs) | Database driver; handles sheet reads, row appending, ID generation, and indexing |
| `Idempotency.gs` | [`backend/google-apps-script/Idempotency.gs`](backend/google-apps-script/Idempotency.gs) | Mutex & deduplication engine using client `requestId` tokens |
| `AuditService.gs` | [`backend/google-apps-script/AuditService.gs`](backend/google-apps-script/AuditService.gs) | SHA-256 immutable audit logging capturing before/after transaction states |
| `ApiRouter.gs` | [`backend/google-apps-script/ApiRouter.gs`](backend/google-apps-script/ApiRouter.gs) | REST action dispatcher and Role-Based Access Control (RBAC) gatekeeper |
| `Code.gs` | [`backend/google-apps-script/Code.gs`](backend/google-apps-script/Code.gs) | HTTP `doPost` / `doGet` gateway entrypoint with JSON envelope serialization |
| `SeedData.gs` | [`backend/google-apps-script/SeedData.gs`](backend/google-apps-script/SeedData.gs) | Seed generator; populates users (`admin`, `manager`, `trader1`, `priya`) and demo data |

> [!TIP]
> You can delete the default empty `Code.gs` before pasting or overwrite its contents with `backend/google-apps-script/Code.gs`.

---

### Step 4: Initialize All 17 Sheets & Seed Data
1. In the Apps Script toolbar dropdown (next to *Debug*), select the function: **`seedDevelopmentData`** (or `initializeDatabaseSheets` for clean empty sheets).
2. Click **Run ▶️**.
3. **Handle Google Authorization Screen** (First time run only):
   - A dialog titled *"Authorization required"* will appear → click **Review permissions**.
   - Choose your Google Account.
   - You will see a warning: *"Google hasn't verified this app"* → click **Advanced** (in small text at bottom-left).
   - Click **Go to Asset Management API (unsafe)**.
   - Click **Allow**.
4. The script will run for ~5-10 seconds. Check the *Execution log* at the bottom to see:
   `Execution completed`.
5. Switch back to your Google Spreadsheet tab in the browser. You will see **17 formatted relational sheets** generated and populated:
   - `Users`, `Investors`, `Investor_Bank`, `Investments`, `Investor_Payments`, `Investor_Documents`
   - `Staff`, `Trades`, `Staff_Commissions`, `Company_Capital`, `Company_PnL`, `Expenses`, `Salaries`
   - `Policies`, `Documents`, `Audit_Log`, `Settings`

---

### Step 5: Deploy as Web App
1. In the top-right corner of the Apps Script editor, click **Deploy** → **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* → choose **Web app**.
3. Enter the deployment configuration:
   - **Description**: `Asset Management API v1.0`
   - **Execute as**: `Me (your Google account email)`
   - **Who has access**: **`Anyone`** ⚠️ *(CRITICAL: Do NOT choose "Only myself". The mobile app requires "Anyone" so HTTP requests can reach the endpoint without manual Google login popups).*
4. Click **Deploy**.
5. Copy the generated **Web App URL** (format: `https://script.google.com/macros/s/AKfycb.../exec`).

> [!NOTE]
> **Quick Browser Test**: Paste your Web App URL into your browser address bar with `?action=settings.get` appended:
> `https://script.google.com/macros/s/AKfycb.../exec?action=settings.get`
> You should receive a JSON response: `{"success":true,"data":[...],"message":"Operation completed successfully"}`.

---

### Step 6: Connect the Mobile App

You can connect the app to your live Google Sheet using either of two methods:

#### Method A: Directly inside the Mobile App UI
1. Launch the mobile app and log in with demo credentials (`admin` / `admin123`).
2. Navigate to the **More** tab (bottom navigation) → tap **Settings & Config**.
3. Under **DATA REPOSITORY MODE**, toggle **OFF** `Offline Mock Development Mode`.
4. In the **Google Apps Script Web App URL** input field, paste your copied Web App URL.
5. Tap **Save Configurations**.
6. Check the top header banner: it will display `🟢 Online (GAS Live)`!

#### Method B: Set as Default in Codebase (For Production Builds)
If building standalone APKs or want the app to always connect to your sheet by default:
1. Open [`src/constants/config.ts`](src/constants/config.ts).
2. Update the default parameters:
   ```typescript
   export const APP_CONFIG = {
     // ...
     DEFAULT_API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
     USE_MOCK_DATA: false // Set to false so the app defaults to your live sheet
   };
   ```

---

### Step 7: Updating Apps Script Backend (Redeploying)
Whenever you modify or add code to `.gs` files in Google Apps Script, **Google requires creating a new version** for changes to take effect:
1. In the Apps Script editor, click **Deploy** → **Manage deployments**.
2. Click the **Edit** (pencil icon ✏️) in the top-right of the active deployment.
3. In the **Version** dropdown, select **New version**.
4. Click **Deploy**.
*(Your Web App URL remains the exact same; the deployment now runs the updated code).*

---

### 🛠️ Common Troubleshooting

| Issue / Error | Cause | Solution |
|---|---|---|
| **`SyntaxError: Unexpected token '<' ... is not valid JSON`** | "Who has access" was set to "Only myself", causing Google to return an HTML login page instead of JSON. | Go to Deploy → Manage deployments → Edit → Change **Who has access** to **`Anyone`** → Deploy. |
| **`Authorization required` or `401 Unauthorized`** | Initial authorizations were not granted when running `seedDevelopmentData`. | In Apps Script, run `seedDevelopmentData` again, click "Review permissions" → Advanced → "Go to Asset Management API (unsafe)" → Allow. |
| **Changes in `.gs` files not reflecting in mobile app** | Updated code was saved but not redeployed to a new version. | Click Deploy → Manage deployments → Edit ✏️ → Version: **New version** → Deploy. |
| **Mobile app shows "Network request failed"** | Missing `/exec` at the end of the URL or device has no internet access. | Verify the URL ends with `/exec` (NOT `/edit` or `/dev`). Check phone internet connection. |
| **Reset all data to clean state** | Need to wipe and re-seed sample data. | In Apps Script, run `seedDevelopmentData()`. It will automatically re-create and populate all tabs. |

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

## 📱 Building Android APK & Release Bundle

### Option 1: Local Gradle Build (from `android/` directory)

Ensure your `JAVA_HOME` and `ANDROID_HOME` environment variables are set:

```bash
# Navigate to native android folder
cd android

# 1. Build Standalone Debug APK (Quickest / No signing required)
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# 2. Build Release APK
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release-unsigned.apk

# 3. Build Google Play Store Bundle (.aab)
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab

# Clean build cache
./gradlew clean
```

### Option 2: Cloud Build with EAS (Direct APK Download Link)

```bash
# Build standalone installable APK on Expo cloud
npx eas-cli build -p android --profile preview

# Build production Play Store AAB bundle
npx eas-cli build -p android --profile production
```

---

## 🔑 Role-Based Access Control (RBAC) & Login Personas

When running in **Offline Mock Mode** or against the live Google Sheets database, the platform enforces 3 security tiers:

### 📊 Role Comparison Matrix

| Feature / Capability | 👑 Admin (`admin`) | 👔 Desk Manager (`manager`) | 📈 Staff / Trader (`trader1`) |
| :--- | :---: | :---: | :---: |
| **Executive Dashboard & Consolidated P&L** | ✅ Full Firm P&L | ✅ Firm Overview | ❌ Hidden |
| **Investor Management & Tranches** | ✅ View, Add & Edit | ✅ View, Add & Edit | ❌ Hidden |
| **Bank Account Numbers & Phone Numbers** | 🔓 **Unmasked** Full View | 🔒 **Masked** (`XXXX 4582`) | ❌ Hidden |
| **Disburse Payments to Investors** | ✅ Mark Paid | ✅ Mark Paid | ❌ Hidden |
| **Reverse Financial Payments** | ✅ Authorized with Audit | ❌ Restricted | ❌ Hidden |
| **Trading Desk Books** | ✅ All Firm Trades | ✅ All Firm Trades | 👤 **Only Own Trades** |
| **Trade Settlement & Profit Distribution** | ✅ Settle & Calculate | ✅ Settle & Calculate | ❌ Log Trades Only |
| **Staff Salaries & Payroll** | 🔓 Full Salaries & Payroll | 🔒 Marked Confidential | 👤 **Only Own Salary Slip** |
| **Expense Management** | ✅ Submit & Approve | ✅ Submit & Approve | 📝 Submit Claims Only |
| **Immutable Audit Trail Log** | ✅ View Full Audit Trail | ❌ Restricted | ❌ Hidden |
| **Google Sheets & Backend API Settings** | ✅ Full Access | ❌ Restricted | ❌ Hidden |

### 🔐 Login Credentials (Demo / Mock Mode)

| Role | Username | Password | Access Scope |
|---|---|---|---|
| **Super Admin** | `admin` | `admin123` | Unrestricted firm-wide access to all ledgers, unmasked PI data, payroll, reversals, and audit logs |
| **Desk Manager** | `manager` | `manager123` | Operational lead: manages investors, reviews/settles trades, approves expenses (investor data masked, salaries hidden) |
| **Prop Trader 1** | `trader1` | `trader123` | Vikram Sharma (`STAFF-00002`): logs personal trades, views own commission ledger and salary slip |
| **Prop Trader 2** | `priya` | `trader123` | Priya Patel (`STAFF-00003`): Options specialist segregated workspace |
| **New Staff / Custom** | *Custom* | *Custom* | Created directly in-app via **Staff** → **Onboard Staff** with automatic login account generation |

### 🔍 Detailed Persona Breakdown

#### 1. 👑 **Super Admin** (`admin` / `admin123`) — *Managing Director / Firm Owner*
* **Access Level**: Unrestricted full access to the entire firm's operations.
* **Exclusive Powers**:
  - View **unmasked** investor phone numbers and bank account details.
  - View all staff basic salaries and execute monthly payroll.
  - Perform **financial payment reversals** with mandatory justification audit stamps.
  - Access system configuration (Google Sheets API sync endpoints) and view the immutable **Audit Trail**.

#### 2. 👔 **Desk Manager** (`manager` / `manager123`) — *Trading Desk & Operations Lead*
* **Access Level**: Full operational management across investors and trading operations.
* **Guardrails & Privacy Protections**:
  - Can onboard investors, edit tranches, record payments, and approve expenses.
  - Sensitive investor phone numbers and bank accounts are **privacy-masked** (`+91 98765 *****`, `XXXX XXXX 4582`).
  - Cannot view other staff members' basic salaries (`🔒 Confidential`).
  - Cannot reverse financial transactions or alter system backend configurations.

#### 3. 📈 **Staff / Trader** (`trader1` / `trader123`) — *Prop Trader / Desk Analyst*
* **Access Level**: Segregated single-user workspace focused on personal execution.
* **Scope**:
  - **Zero access** to investor capital, investor portfolios, or firm financials.
  - Can log personal buy/sell trade executions (`Add Trade`) and track personal Win/Loss performance.
  - Can view **only their own** monthly salary slips, trading commissions, and submit reimbursement expense vouchers.

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


## Sheet URL
https://script.google.com/macros/s/AKfycbxzsMSSWl4yikYFV9aLIP7w8C90J9tw-31vBgafzCsOaBx8eZf5GAE3FbdgavkdMGdXuw/exec
