/**
 * SheetRepository.gs
 * Header-based Google Sheets Repository Layer
 *
 * Provides safe, indexed, header-mapped CRUD operations across all 17 operational tabs.
 */

var SHEET_NAMES = {
  USERS: 'Users',
  INVESTORS: 'Investors',
  INVESTOR_BANK: 'Investor_Bank',
  INVESTMENTS: 'Investments',
  INVESTOR_PAYMENTS: 'Investor_Payments',
  INVESTOR_DOCUMENTS: 'Investor_Documents',
  STAFF: 'Staff',
  TRADES: 'Trades',
  STAFF_COMMISSIONS: 'Staff_Commissions',
  COMPANY_CAPITAL: 'Company_Capital',
  COMPANY_PNL: 'Company_PnL',
  EXPENSES: 'Expenses',
  SALARIES: 'Salaries',
  POLICIES: 'Policies',
  DOCUMENTS: 'Documents',
  AUDIT_LOG: 'Audit_Log',
  SETTINGS: 'Settings'
};

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet not found: ' + sheetName);
  }
  return sheet;
}

/**
 * Reads all rows from a sheet as an array of JSON objects mapped by header names.
 */
function readRows(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var rowData = data[i];
    // Skip empty rows
    if (rowData.join('').trim() === '') continue;

    var item = { _rowIndex: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      if (header) {
        item[header] = rowData[j];
      }
    }
    rows.push(item);
  }
  return rows;
}

/**
 * Finds a single row by field value (e.g. primary key).
 */
function findByField(sheetName, fieldName, value) {
  var rows = readRows(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][fieldName]) === String(value)) {
      return rows[i];
    }
  }
  return null;
}

/**
 * Appends a new row to the specified sheet matching header names.
 */
function appendRow(sheetName, recordObj) {
  var sheet = getSheet(sheetName);
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  var headers = headerRange.getValues()[0].map(function(h) { return String(h).trim(); });

  var newRow = [];
  for (var j = 0; j < headers.length; j++) {
    var key = headers[j];
    var val = recordObj[key];
    newRow.push(val !== undefined && val !== null ? val : '');
  }

  sheet.appendRow(newRow);
  return recordObj;
}

/**
 * Updates an existing row by matching a key field (e.g. primary key).
 */
function updateRow(sheetName, keyField, keyValue, updatedFields) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) throw new Error('Sheet is empty');

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var keyIndex = headers.indexOf(keyField);
  if (keyIndex === -1) throw new Error('Key field not found in headers: ' + keyField);

  var targetRowIndex = -1;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyIndex]) === String(keyValue)) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex === -1) {
    throw new Error('Record not found for ' + keyField + ' = ' + keyValue);
  }

  for (var k in updatedFields) {
    var colIndex = headers.indexOf(k);
    if (colIndex !== -1) {
      sheet.getRange(targetRowIndex, colIndex + 1).setValue(updatedFields[k]);
    }
  }

  return findByField(sheetName, keyField, keyValue);
}

/**
 * Generates an immutable sequential ID.
 */
function generateNextId(sheetName, idField, prefix) {
  var rows = readRows(sheetName);
  var maxSeq = 0;
  for (var i = 0; i < rows.length; i++) {
    var idStr = String(rows[i][idField] || '');
    if (idStr.indexOf(prefix) === 0) {
      var numPart = parseInt(idStr.substring(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  }
  var nextNum = maxSeq + 1;
  var padded = ('00000' + nextNum).slice(-5);
  return prefix + padded;
}
