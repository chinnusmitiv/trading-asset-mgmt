/**
 * Currency Formatting Utilities (Indian Rupee Standard)
 */

/**
 * Formats a numeric amount to Indian Rupee representation (e.g. ₹1,25,00,000 or ₹4,50,000).
 */
export function formatCurrency(
  amount: number | null | undefined,
  includeSymbol: boolean = true,
  decimals: number = 0
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return includeSymbol ? '₹0' : '0';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formattedNumber: string;

  try {
    formattedNumber = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(absAmount);
  } catch (e) {
    formattedNumber = absAmount.toLocaleString();
  }

  const symbol = includeSymbol ? '₹' : '';
  return isNegative ? `-${symbol}${formattedNumber}` : `${symbol}${formattedNumber}`;
}

/**
 * Formats large amounts into readable Indian denominations (e.g. ₹1.25 Cr, ₹45 L, ₹25 K).
 */
export function formatCompactCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let result = '';
  if (abs >= 10000000) {
    result = `₹${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    result = `₹${(abs / 100000).toFixed(2)} L`;
  } else if (abs >= 1000) {
    result = `₹${(abs / 1000).toFixed(1)} K`;
  } else {
    result = `₹${abs.toFixed(0)}`;
  }

  return isNegative ? `-${result}` : result;
}
