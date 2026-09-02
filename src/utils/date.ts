/**
 * Date and Time Formatting Utilities
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats an ISO string or date into "02 Sep 2026"
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const day = ('0' + d.getDate()).slice(-2);
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return String(dateString);
  }
}

/**
 * Formats a date with time: "02 Sep 2026, 03:45 PM"
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const dateFormatted = formatDate(dateString);
    let hours = d.getHours();
    const minutes = ('0' + d.getMinutes()).slice(-2);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = ('0' + hours).slice(-2);
    return `${dateFormatted}, ${hoursStr}:${minutes} ${ampm}`;
  } catch (e) {
    return String(dateString);
  }
}

/**
 * Returns current month string "YYYY-MM"
 */
export function getCurrentMonthPeriod(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = ('0' + (d.getMonth() + 1)).slice(-2);
  return `${year}-${month}`;
}
