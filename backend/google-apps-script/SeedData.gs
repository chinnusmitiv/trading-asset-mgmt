/**
 * SeedData.gs
 * Development seed dataset generator for initial testing and verification.
 */

function seedDevelopmentData() {
  initializeDatabaseSheets();

  // 1. Settings
  var settings = [
    { setting_id: 'SET-00001', key: 'CURRENCY_CODE', value: 'INR', description: 'Default currency symbol', updated_at: new Date().toISOString(), updated_by: 'USR-00001' },
    { setting_id: 'SET-00002', key: 'DEFAULT_TIMEZONE', value: 'Asia/Kolkata', description: 'System timezone', updated_at: new Date().toISOString(), updated_by: 'USR-00001' },
    { setting_id: 'SET-00003', key: 'DEFAULT_STAFF_PROFIT_SHARE', value: '20', description: 'Default trader profit cut %', updated_at: new Date().toISOString(), updated_by: 'USR-00001' }
  ];
  settings.forEach(function(s) { appendRow(SHEET_NAMES.SETTINGS, s); });

  // 2. Users
  var users = [
    { user_id: 'USR-00001', username: 'admin', password_hash: 'admin123', full_name: 'Super Admin', email: 'admin@assetmgmt.internal', role: 'Admin', staff_id: '', status: 'Active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { user_id: 'USR-00002', username: 'manager', password_hash: 'manager123', full_name: 'Operations Manager', email: 'manager@assetmgmt.internal', role: 'Manager', staff_id: 'STAFF-00001', status: 'Active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { user_id: 'USR-00003', username: 'trader1', password_hash: 'trader123', full_name: 'Vikram Sharma', email: 'vikram@assetmgmt.internal', role: 'Staff', staff_id: 'STAFF-00002', status: 'Active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];
  users.forEach(function(u) { appendRow(SHEET_NAMES.USERS, u); });

  // 3. Staff
  var staffList = [
    { staff_id: 'STAFF-00001', name: 'Operations Manager', phone: '+91 98765 43210', email: 'manager@assetmgmt.internal', role: 'Manager', department: 'Operations', joining_date: '2024-01-15', basic_salary: 150000, trading_percentage: 0, commission_percentage: 5, status: 'Active', bank_details_reference: 'BNK-S01', notes: 'Head of Operations', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { staff_id: 'STAFF-00002', name: 'Vikram Sharma', phone: '+91 98111 22334', email: 'vikram@assetmgmt.internal', role: 'Trader', department: 'Prop Trading', joining_date: '2024-03-01', basic_salary: 80000, trading_percentage: 20, commission_percentage: 0, status: 'Active', bank_details_reference: 'BNK-S02', notes: 'Index Derivatives Trader', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { staff_id: 'STAFF-00003', name: 'Priya Patel', phone: '+91 98222 33445', email: 'priya@assetmgmt.internal', role: 'Trader', department: 'Prop Trading', joining_date: '2024-06-01', basic_salary: 80000, trading_percentage: 20, commission_percentage: 0, status: 'Active', bank_details_reference: 'BNK-S03', notes: 'Options Selling Specialist', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];
  staffList.forEach(function(s) { appendRow(SHEET_NAMES.STAFF, s); });

  // 4. Investors (5)
  var investors = [
    { investor_id: 'INV-00001', name: 'Rajesh Kumar', phone: '+91 98333 44556', email: 'rajesh.kumar@example.com', address: 'Bandra West, Mumbai', joining_date: '2025-01-10', status: 'Active', notes: 'HNI Investor', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { investor_id: 'INV-00002', name: 'Ananya Singhania', phone: '+91 98444 55667', email: 'ananya.s@example.com', address: 'Vasant Vihar, New Delhi', joining_date: '2025-02-15', status: 'Active', notes: 'Family Office', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { investor_id: 'INV-00003', name: 'Suresh Rao', phone: '+91 98555 66778', email: 'suresh.rao@example.com', address: 'Indiranagar, Bengaluru', joining_date: '2025-03-20', status: 'Active', notes: 'Corporate Executive', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { investor_id: 'INV-00004', name: 'Kavita Menon', phone: '+91 98666 77889', email: 'kavita.m@example.com', address: 'Alwarpet, Chennai', joining_date: '2025-05-01', status: 'Active', notes: 'Real estate investor', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { investor_id: 'INV-00005', name: 'Amit Shah', phone: '+91 98777 88990', email: 'amit.shah@example.com', address: 'Bodakdev, Ahmedabad', joining_date: '2025-07-10', status: 'Active', notes: 'Textile Entrepreneur', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ];
  investors.forEach(function(inv) { appendRow(SHEET_NAMES.INVESTORS, inv); });

  // 5. Investor Bank Details (Masked)
  var banks = [
    { bank_id: 'BNK-00001', investor_id: 'INV-00001', account_holder_name: 'Rajesh Kumar', bank_name: 'HDFC Bank', account_number_masked: 'XXXX XXXX 4582', ifsc_code: 'HDFC0000123', account_type: 'Savings', is_primary: true, created_at: new Date().toISOString() },
    { bank_id: 'BNK-00002', investor_id: 'INV-00002', account_holder_name: 'Ananya Singhania', bank_name: 'ICICI Bank', account_number_masked: 'XXXX XXXX 9912', ifsc_code: 'ICIC0000456', account_type: 'Current', is_primary: true, created_at: new Date().toISOString() },
    { bank_id: 'BNK-00003', investor_id: 'INV-00003', account_holder_name: 'Suresh Rao', bank_name: 'Axis Bank', account_number_masked: 'XXXX XXXX 3341', ifsc_code: 'UTIB0000789', account_type: 'Savings', is_primary: true, created_at: new Date().toISOString() },
    { bank_id: 'BNK-00004', investor_id: 'INV-00004', account_holder_name: 'Kavita Menon', bank_name: 'Kotak Mahindra Bank', account_number_masked: 'XXXX XXXX 7720', ifsc_code: 'KKBK0000101', account_type: 'Savings', is_primary: true, created_at: new Date().toISOString() },
    { bank_id: 'BNK-00005', investor_id: 'INV-00005', account_holder_name: 'Amit Shah', bank_name: 'State Bank of India', account_number_masked: 'XXXX XXXX 6114', ifsc_code: 'SBIN0000202', account_type: 'Current', is_primary: true, created_at: new Date().toISOString() }
  ];
  banks.forEach(function(b) { appendRow(SHEET_NAMES.INVESTOR_BANK, b); });

  // 6. Investments (10)
  var investments = [
    { investment_id: 'INVEST-00001', investor_id: 'INV-00001', principal_amount: 10000000, investment_date: '2025-01-15', maturity_date: '2027-01-15', return_percentage: 2.5, monthly_return: 250000, payment_frequency: 'Monthly', policy_id: 'POL-00001', status: 'Active', notes: 'Tranche A', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'USR-00001' },
    { investment_id: 'INVEST-00002', investor_id: 'INV-00001', principal_amount: 5000000, investment_date: '2025-06-01', maturity_date: '2027-06-01', return_percentage: 2.5, monthly_return: 125000, payment_frequency: 'Monthly', policy_id: 'POL-00001', status: 'Active', notes: 'Tranche B', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'USR-00001' },
    { investment_id: 'INVEST-00003', investor_id: 'INV-00002', principal_amount: 20000000, investment_date: '2025-02-20', maturity_date: '2027-02-20', return_percentage: 2.2, monthly_return: 440000, payment_frequency: 'Monthly', policy_id: 'POL-00001', status: 'Active', notes: 'Primary allocation', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'USR-00001' },
    { investment_id: 'INVEST-00004', investor_id: 'INV-00003', principal_amount: 7500000, investment_date: '2025-03-25', maturity_date: '2026-03-25', return_percentage: 2.5, monthly_return: 187500, payment_frequency: 'Monthly', policy_id: 'POL-00001', status: 'Active', notes: '1 Year Lock-in', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'USR-00001' },
    { investment_id: 'INVEST-00005', investor_id: 'INV-00004', principal_amount: 5000000, investment_date: '2025-05-10', maturity_date: '2026-05-10', return_percentage: 2.5, monthly_return: 125000, payment_frequency: 'Monthly', policy_id: 'POL-00001', status: 'Active', notes: 'Tranche 1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'USR-00001' },
    { investment_id: 'INVEST-00006', investor_id: 'INV-00005', principal_amount: 15000000, investment_date: '2025-07-15', maturity_date: '2027-07-15', return_percentage: 2.3, monthly_return: 345000, payment_frequency: 'Monthly', policy_id: 'POL-00001', status: 'Active', notes: 'Tranche A', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: 'USR-00001' }
  ];
  investments.forEach(function(inv) { appendRow(SHEET_NAMES.INVESTMENTS, inv); });

  Logger.log('Seed development data populated successfully.');
}
