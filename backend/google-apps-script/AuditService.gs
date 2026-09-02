/**
 * AuditService.gs
 * System-wide audit event generator. Records all state modifications into Audit_Log.
 */

function logAuditEvent(userId, action, module, recordId, oldValue, newValue, reason) {
  try {
    var auditId = generateNextId(SHEET_NAMES.AUDIT_LOG, 'audit_id', 'AUD-');
    var timestamp = new Date().toISOString();

    var logEntry = {
      audit_id: auditId,
      timestamp: timestamp,
      user_id: userId || 'SYSTEM',
      action: action,
      module: module,
      record_id: recordId || '',
      old_value: oldValue ? (typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)) : '',
      new_value: newValue ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) : '',
      reason: reason || ''
    };

    appendRow(SHEET_NAMES.AUDIT_LOG, logEntry);
    return logEntry;
  } catch (err) {
    Logger.log('CRITICAL: Failed to write audit log: ' + err.toString());
  }
}
