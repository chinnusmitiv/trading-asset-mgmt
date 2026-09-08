import {
  calculateTradePnL,
  calculateExecutionRealizedPnL,
  calculateStaffShare,
  calculateCompanyShare,
  calculateROI,
  calculateInvestorMonthlyReturn,
  calculateOutstandingPrincipal,
  calculateInvestorProfitPaid,
  calculateNetSalary,
  calculateCompanyNetProfit,
  calculateCapitalUtilization,
  calculateWinRate
} from '../src/utils/calculations';

describe('Financial Calculations Engine', () => {
  describe('Trade P&L & Profit Splits', () => {
    it('calculates positive net P&L accurately', () => {
      expect(calculateTradePnL(150000, 25000)).toBe(125000);
    });

    it('calculates negative net P&L (loss)', () => {
      expect(calculateTradePnL(10000, 45000)).toBe(-35000);
    });

    it('auto-calculates realized long trade profit and points gain', () => {
      // Bought 300 qty @ 51200, Sold @ 51550 -> 350 pts gain -> 105,000 profit
      const result = calculateExecutionRealizedPnL(51200, 51550, 300, false);
      expect(result.pointsDifference).toBe(350);
      expect(result.grossProfit).toBe(105000);
      expect(result.grossLoss).toBe(0);
      expect(result.netPnL).toBe(105000);
      expect(result.turnover).toBe(15360000);
    });

    it('auto-calculates realized long trade loss when exit < entry', () => {
      // Bought 100 qty @ 500, Sold @ 450 -> 50 pts loss -> 5000 loss
      const result = calculateExecutionRealizedPnL(500, 450, 100, false);
      expect(result.pointsDifference).toBe(-50);
      expect(result.grossProfit).toBe(0);
      expect(result.grossLoss).toBe(5000);
      expect(result.netPnL).toBe(-5000);
    });

    it('auto-calculates realized short trade profit when exit < entry', () => {
      // Shorted 200 qty @ 24500, Covered @ 24300 -> 200 pts profit -> 40000 profit
      const result = calculateExecutionRealizedPnL(24500, 24300, 200, true);
      expect(result.pointsDifference).toBe(200);
      expect(result.grossProfit).toBe(40000);
      expect(result.grossLoss).toBe(0);
      expect(result.netPnL).toBe(40000);
    });

    it('auto-calculates net P&L with brokerage and charges deducted', () => {
      // Gross 50,000 profit minus 1,200 charges -> Net 48,800
      const result = calculateExecutionRealizedPnL(100, 150, 1000, false, 1200);
      expect(result.grossProfit).toBe(50000);
      expect(result.netPnL).toBe(48800);
    });

    it('handles zero or invalid input gracefully', () => {
      const result = calculateExecutionRealizedPnL(0, 500, 100);
      expect(result.grossProfit).toBe(0);
      expect(result.netPnL).toBe(0);
    });

    it('calculates staff profit share on profit', () => {
      const netPnL = 100000;
      const appliedPercentage = 20;
      const staffShare = calculateStaffShare(netPnL, appliedPercentage);
      const companyShare = calculateCompanyShare(netPnL, staffShare);

      expect(staffShare).toBe(20000);
      expect(companyShare).toBe(80000);
      // Invariant: staffShare + companyShare === netPnL
      expect(staffShare + companyShare).toBe(netPnL);
    });

    it('allocates 0 staff share on trading loss', () => {
      const netPnL = -50000;
      const staffShare = calculateStaffShare(netPnL, 20);
      const companyShare = calculateCompanyShare(netPnL, staffShare);

      expect(staffShare).toBe(0);
      expect(companyShare).toBe(-50000);
    });

    it('calculates trade ROI %', () => {
      expect(calculateROI(135000, 2500000)).toBe(5.4);
      expect(calculateROI(0, 1000000)).toBe(0);
      expect(calculateROI(50000, 0)).toBe(0); // Zero division guard
    });
  });

  describe('Investor Return & Principal Invariants', () => {
    it('calculates monthly investor return', () => {
      // 1 Crore at 2.5% per month
      expect(calculateInvestorMonthlyReturn(10000000, 2.5, 'Monthly')).toBe(250000);
    });

    it('calculates quarterly investor return', () => {
      expect(calculateInvestorMonthlyReturn(10000000, 2.5, 'Quarterly')).toBe(750000);
    });

    it('calculates outstanding principal balance', () => {
      expect(calculateOutstandingPrincipal(10000000, 2500000)).toBe(7500000);
      expect(calculateOutstandingPrincipal(5000000, 6000000)).toBe(0); // Clamped to zero
    });

    it('calculates total profit distributed from payment history', () => {
      const samplePayments: any[] = [
        { paymentId: 'P1', status: 'Paid', profitAmount: 250000 },
        { paymentId: 'P2', status: 'Paid', profitAmount: 250000 },
        { paymentId: 'P3', status: 'Pending', profitAmount: 250000 },
        { paymentId: 'P4', status: 'Cancelled', profitAmount: 250000 }
      ];
      expect(calculateInvestorProfitPaid(samplePayments)).toBe(500000);
    });
  });

  describe('Staff Net Salary Formula', () => {
    it('calculates net salary: basic + allowance + bonus + commission - deduction - advance', () => {
      const net = calculateNetSalary(80000, 10000, 15000, 20000, 5000, 10000);
      // 80000 + 10000 + 15000 + 20000 - 5000 - 10000 = 110000
      expect(net).toBe(110000);
    });
  });

  describe('Company Net Profit Formula', () => {
    it('calculates net company profit against all expenses and distributions', () => {
      const netProfit = calculateCompanyNetProfit(
        500000, // tradingPnL
        50000,  // otherIncome
        150000, // investorProfitPaid
        60000,  // staffCommission
        40000,  // officeExpenses
        120000, // salaries
        0       // otherExpenses
      );
      // Revenue = 550000, Expenses = 370000 -> Net = 180000
      expect(netProfit).toBe(180000);
    });
  });

  describe('Performance Ratios', () => {
    it('calculates capital utilization %', () => {
      expect(calculateCapitalUtilization(35000000, 50000000)).toBe(70);
      expect(calculateCapitalUtilization(0, 0)).toBe(0);
    });

    it('calculates win rate %', () => {
      expect(calculateWinRate(15, 20)).toBe(75);
      expect(calculateWinRate(0, 0)).toBe(0);
    });
  });
});
