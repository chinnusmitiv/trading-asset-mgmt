import {
  calculateTradePnL,
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
