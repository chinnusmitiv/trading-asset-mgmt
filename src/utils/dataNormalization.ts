/**
 * Data Normalization Utility
 *
 * Normalizes backend responses (e.g. from Google Apps Script / Google Sheets)
 * where headers and row properties are formatted in snake_case (e.g. investor_id, joining_date, net_pnl)
 * into frontend-expected camelCase properties (e.g. investorId, joiningDate, netPnL),
 * while retaining the original snake_case properties for complete backward/forward compatibility.
 */

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

export function normalizeAppsScriptResponse<T = any>(data: any): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => normalizeAppsScriptResponse(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const normalizedValue = normalizeAppsScriptResponse(value);

      // Keep original key
      result[key] = normalizedValue;

      // Add camelCase key
      const camelKey = snakeToCamel(key);
      result[camelKey] = normalizedValue;

      // Explicit aliases for domain models
      if (key === 'net_pnl' || camelKey === 'netPnl') {
        result['netPnL'] = normalizedValue;
        result['netPnl'] = normalizedValue;
      }

      if (camelKey === 'isPrimary' && typeof normalizedValue === 'string') {
        result['isPrimary'] = normalizedValue.toUpperCase() === 'TRUE';
      }
    }

    return result as T;
  }

  return data;
}
