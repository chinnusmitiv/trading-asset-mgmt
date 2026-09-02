/**
 * Sensitive Data Masking Utilities
 */

/**
 * Masks a bank account number, displaying only the last 4 digits (e.g. "XXXX XXXX 4582").
 */
export function maskBankAccount(accountNumber: string | null | undefined): string {
  if (!accountNumber) return 'XXXX XXXX 0000';
  const clean = String(accountNumber).replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `XXXX XXXX ${last4}`;
}

/**
 * Masks a phone number (e.g. "+91 98*** **556").
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—';
  const str = String(phone);
  if (str.length < 8) return str;
  const prefix = str.slice(0, 6);
  const suffix = str.slice(-3);
  return `${prefix}****${suffix}`;
}

/**
 * Masks an email address (e.g. "r***r@example.com").
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '—';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}
