/**
 * SetupSheets.gs
 * One-click initialization script that sets up all 17 sheets with exact column headers and styles.
 */

var SCHEMAS = {
  Users: ['user_id', 'username', 'password_hash', 'full_name', 'email', 'role', 'staff_id', 'status', 'created_at', 'updated_at'],
  Investors: ['investor_id', 'name', 'phone', 'email', 'address', 'joining_date', 'status', 'notes', 'created_at', 'updated_at'],
  Investor_Bank: ['bank_id', 'investor_id', 'account_holder_name', 'bank_name', 'account_number_masked', 'ifsc_code', 'account_type', 'is_primary', 'created_at'],
  Investments: ['investment_id', 'investor_id', 'principal_amount', 'investment_date', 'maturity_date', 'return_percentage', 'monthly_return', 'payment_frequency', 'policy_id', 'status', 'notes', 'created_at', 'updated_at', 'created_by'],
  Investor_Payments: ['payment_id', 'investor_id', 'investment_id', 'payment_date', 'payment_month', 'principal_amount', 'profit_amount', 'other_amount', 'total_amount', 'payment_method', 'payment_reference', 'status', 'notes', 'created_at', 'created_by'],
  Investor_Documents: ['document_id', 'entity_type', 'entity_id', 'document_type', 'document_name', 'drive_file_id', 'drive_url', 'uploaded_date', 'expiry_date', 'status', 'created_by'],
  Staff: ['staff_id', 'name', 'phone', 'email', 'role', 'department', 'joining_date', 'basic_salary', 'trading_percentage', 'commission_percentage', 'status', 'bank_details_reference', 'notes', 'created_at', 'updated_at'],
  Trades: ['trade_id', 'staff_id', 'trade_date', 'asset', 'trade_type', 'capital_used', 'entry_price', 'exit_price', 'quantity', 'gross_profit', 'gross_loss', 'net_pnl', 'applied_percentage', 'staff_share', 'company_share', 'roi_percentage', 'status', 'notes', 'created_at', 'created_by'],
  Staff_Commissions: ['commission_id', 'staff_id', 'trade_id', 'commission_period', 'base_amount', 'applied_percentage', 'commission_amount', 'status', 'created_at', 'approved_at', 'paid_at'],
  Company_Capital: ['capital_id', 'date', 'total_investor_capital', 'deployed_capital', 'available_capital', 'reserved_capital', 'withdrawn_capital', 'notes', 'created_at'],
  Company_PnL: ['pnl_id', 'period', 'trading_pnl', 'other_income', 'investor_profit_paid', 'staff_commission', 'office_expenses', 'salaries', 'other_expenses', 'net_company_profit', 'reconciled_at'],
  Expenses: ['expense_id', 'expense_date', 'category', 'description', 'amount', 'payment_method', 'paid_by', 'vendor', 'receipt_url', 'status', 'notes', 'created_at', 'created_by', 'approved_at', 'approved_by'],
  Salaries: ['salary_id', 'staff_id', 'salary_month', 'basic_salary', 'allowance', 'bonus', 'commission', 'deduction', 'advance', 'net_salary', 'payment_date', 'payment_status', 'payment_reference', 'notes', 'created_at', 'created_by', 'approved_at', 'approved_by'],
  Policies: ['policy_id', 'policy_name', 'description', 'value', 'unit', 'effective_from', 'effective_until', 'status', 'version', 'created_at', 'created_by'],
  Documents: ['document_id', 'entity_type', 'entity_id', 'document_type', 'document_name', 'drive_file_id', 'drive_url', 'uploaded_date', 'expiry_date', 'status', 'created_by'],
  Audit_Log: ['audit_id', 'timestamp', 'user_id', 'action', 'module', 'record_id', 'old_value', 'new_value', 'reason'],
  Settings: ['setting_id', 'key', 'value', 'description', 'updated_at', 'updated_by']
};

function initializeDatabaseSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  for (var sheetName in SCHEMAS) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    var headers = SCHEMAS[sheetName];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#1E293B').setFontColor('#F8FAFC');
    sheet.setFrozenRows(1);
  }

  Logger.log('Successfully initialized all 17 database tabs.');
}
