/**
 * Pure Deterministic Financial Calculations Engine
 *
 * All business calculations are strictly isolated here and covered by 100% unit tests.
 */

import { InvestorPayment, PaymentFrequency } from '../types';

/**
 * Calculates monthly return for an investor based on principal and monthly rate %.
 */
export function calculateInvestorMonthlyReturn(
  principalAmount: number,
  returnPercentage: number,
  frequency: PaymentFrequency = 'Monthly'
): number {
  if (principalAmount <= 0 || returnPercentage <= 0) return 0;
  var monthlyAmount = (principalAmount * returnPercentage) / 100;
  
  switch (frequency) {
    case 'Quarterly':
      return monthlyAmount * 3;
    case 'Annual':
      return monthlyAmount * 12;
    default:
      return monthlyAmount;
  }
}

/**
 * Calculates remaining outstanding principal after repayments.
 */
export function calculateOutstandingPrincipal(
  totalPrincipal: number,
  principalRepaid: number
): number {
  var remaining = totalPrincipal - principalRepaid;
  return remaining > 0 ? remaining : 0;
}

/**
 * Calculates total profit distributed to an investor across payment history.
 */
export function calculateInvestorProfitPaid(payments: InvestorPayment[]): number {
  if (!payments || payments.length === 0) return 0;
  return payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + (p.profitAmount || 0), 0);
}

/**
 * Calculates realized net trade P&L (Gross Profit - Gross Loss).
 */
export function calculateTradePnL(grossProfit: number, grossLoss: number): number {
  return Number((grossProfit - grossLoss).toFixed(2));
}

/**
 * Calculates staff profit cut based on trade Net P&L and locked applied percentage.
 * Traders earn only on positive net profit unless configured.
 */
export function calculateStaffShare(
  netPnL: number,
  appliedStaffPercentage: number
): number {
  if (netPnL <= 0 || appliedStaffPercentage <= 0) return 0;
  return Number(((netPnL * appliedStaffPercentage) / 100).toFixed(2));
}

/**
 * Calculates company retained profit from a trade.
 */
export function calculateCompanyShare(netPnL: number, staffShare: number): number {
  return Number((netPnL - staffShare).toFixed(2));
}

/**
 * Calculates Return on Investment (ROI) %.
 */
export function calculateROI(netProfit: number, capitalBase: number): number {
  if (!capitalBase || capitalBase === 0) return 0;
  return Number(((netProfit / capitalBase) * 100).toFixed(2));
}

/**
 * Calculates net take-home salary after additions and deductions.
 */
export function calculateNetSalary(
  basicSalary: number,
  allowance: number = 0,
  bonus: number = 0,
  commission: number = 0,
  deduction: number = 0,
  advance: number = 0
): number {
  var gross = (basicSalary || 0) + (allowance || 0) + (bonus || 0) + (commission || 0);
  var totalDeductions = (deduction || 0) + (advance || 0);
  var net = gross - totalDeductions;
  return Number(net.toFixed(2));
}

/**
 * Calculates bottom-line Net Company Profit:
 * Net Profit = (Trading P&L + Other Income) - (Investor Profit Paid + Staff Commission + Office Expenses + Salaries + Other Expenses)
 */
export function calculateCompanyNetProfit(
  tradingPnL: number,
  otherIncome: number = 0,
  investorProfitPaid: number = 0,
  staffCommission: number = 0,
  officeExpenses: number = 0,
  salaries: number = 0,
  otherExpenses: number = 0
): number {
  var totalRevenue = (tradingPnL || 0) + (otherIncome || 0);
  var totalCosts =
    (investorProfitPaid || 0) +
    (staffCommission || 0) +
    (officeExpenses || 0) +
    (salaries || 0) +
    (otherExpenses || 0);
  return Number((totalRevenue - totalCosts).toFixed(2));
}

/**
 * Calculates capital utilization percentage.
 */
export function calculateCapitalUtilization(
  deployedCapital: number,
  totalCapital: number
): number {
  if (!totalCapital || totalCapital === 0) return 0;
  return Number(((deployedCapital / totalCapital) * 100).toFixed(2));
}

/**
 * Calculates trading win rate percentage.
 */
export function calculateWinRate(
  winningTrades: number,
  totalTrades: number
): number {
  if (!totalTrades || totalTrades === 0) return 0;
  return Number(((winningTrades / totalTrades) * 100).toFixed(2));
}
