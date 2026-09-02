# Google Apps Script Backend Deployment Guide

This folder contains the complete Google Apps Script (GAS) backend for the Asset Management Operations platform.

---

## 1. Fast Setup Instructions

1. **Create a new Google Sheet**:
   - Go to [Google Sheets](https://sheets.new) and create a new spreadsheet named `Asset Management Operations Database`.
2. **Open Apps Script Editor**:
   - In the Google Sheet, navigate to **Extensions** > **Apps Script**.
3. **Copy Code Files**:
   - Copy the contents of each file from this folder into the Apps Script editor:
     - `appsscript.json` (Enable manifest editing in Project Settings to paste)
     - `SetupSheets.gs`
     - `SheetRepository.gs`
     - `Idempotency.gs`
     - `AuditService.gs`
     - `ApiRouter.gs`
     - `Code.gs`
     - `SeedData.gs`
4. **Initialize Sheets & Seed Data**:
   - In the Apps Script toolbar, select the function `seedDevelopmentData` and click **Run**.
   - Grant necessary permissions when prompted.
   - Switch back to your Google Sheet to verify all 17 tabs (`Users`, `Investors`, `Trades`, etc.) have been automatically created and populated.
5. **Deploy as Web App**:
   - In the top right, click **Deploy** > **New deployment**.
   - Select type: **Web app**.
   - Description: `Asset Management API v1.0`.
   - **Execute as**: `Me` (your Google account).
   - **Who has access**: `Anyone` (required for mobile client access via HTTPS).
   - Click **Deploy** and copy the resulting **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`).
6. **Configure Mobile App**:
   - In the mobile app, go to **More** > **Settings** > **Backend API URL** and paste your Web App URL, or switch to **Mock Development Mode** for local testing without internet.
