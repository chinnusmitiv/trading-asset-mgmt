/**
 * Phone Number Formatting & Sanitization Utilities
 */

/**
 * Formats a phone number safely for display.
 * Handles spreadsheet formula errors (e.g. "#ERROR!"), leading apostrophes,
 * plain digit sequences, and standardizes to Indian format (+91 XXXXX XXXXX).
 */
export function formatPhoneNumber(phone: string | number | null | undefined): string {
  if (phone === null || phone === undefined) return '—';
  const str = String(phone).trim();

  if (!str || str === '—' || str === 'null' || str === 'undefined') {
    return '—';
  }

  // Handle formula parse errors from spreadsheet (e.g. when +91 was evaluated as formula)
  if (str.startsWith('#ERROR') || str.startsWith('#REF') || str.startsWith('#VALUE') || str.startsWith('#NAME')) {
    return 'Not Set';
  }

  // Strip leading apostrophe, equals sign, or plus used in formulas
  let clean = str.replace(/^['=]+/, '').trim();

  // Extract pure digits
  const digits = clean.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    const mainDigits = digits.slice(2);
    return `+91 ${mainDigits.slice(0, 5)} ${mainDigits.slice(5)}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return clean.startsWith('+') ? clean : (clean ? `+91 ${clean}` : '—');
}

/**
 * Checks if a phone number string is valid and dialable.
 */
export function isValidPhoneNumber(phone: string | number | null | undefined): boolean {
  if (!phone) return false;
  const str = String(phone).trim();
  if (str.startsWith('#')) return false;
  const digits = str.replace(/\D/g, '');
  return digits.length >= 10;
}

/**
 * Sanitizes phone number before persisting to API / Google Sheets.
 */
export function sanitizePhoneForStorage(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    const mainDigits = digits.slice(2);
    return `+91 ${mainDigits.slice(0, 5)} ${mainDigits.slice(5)}`;
  }

  return trimmed;
}
