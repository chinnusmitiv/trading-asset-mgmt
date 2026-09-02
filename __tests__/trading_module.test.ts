import { MockRepository } from '../src/repositories/mockRepository';
import {
  calculateTradePnL,
  calculateStaffShare,
  calculateCompanyShare,
  calculateROI
} from '../src/utils/calculations';

describe('Trading & Staff Module Test Suite (Phase 3)', () => {
  let repo: MockRepository;

  beforeEach(() => {
    repo = new MockRepository();
  });

  describe('Real-Time Trading P&L and Profit Split Invariants', () => {
    it('calculates winning trade Net P&L, 20% staff cut, and company share', async () => {
      const grossProfit = 150000;
      const grossLoss = 15000;
      const capitalUsed = 2500000;
      const traderCutPct = 20;

      const netPnL = calculateTradePnL(grossProfit, grossLoss);
      expect(netPnL).toBe(135000);

      const staffShare = calculateStaffShare(netPnL, traderCutPct);
      expect(staffShare).toBe(27000);

      const companyShare = calculateCompanyShare(netPnL, staffShare);
      expect(companyShare).toBe(108000);

      // Invariant: staffShare + companyShare === netPnL
      expect(staffShare + companyShare).toBe(netPnL);

      const roi = calculateROI(netPnL, capitalUsed);
      expect(roi).toBe(5.4); // 135000 / 2500000 * 100
    });

    it('ensures trader absorbs 0 loss on negative trades, company absorbs full loss', async () => {
      const grossProfit = 0;
      const grossLoss = 50000;
      const traderCutPct = 25;

      const netPnL = calculateTradePnL(grossProfit, grossLoss);
      expect(netPnL).toBe(-50000);

      const staffShare = calculateStaffShare(netPnL, traderCutPct);
      expect(staffShare).toBe(0);

      const companyShare = calculateCompanyShare(netPnL, staffShare);
      expect(companyShare).toBe(-50000);

      // Invariant: staffShare + companyShare === netPnL
      expect(staffShare + companyShare).toBe(netPnL);
    });
  });

  describe('Historical Rate Locking on Trade Execution', () => {
    it('locks the trader cut percentage at trade creation and protects historical trades from subsequent profile edits', async () => {
      // 1. Create a staff member with 20% trading cut
      const trader = await repo.createStaff({
        name: 'Arjun Tendulkar',
        phone: '+91 99887 76655',
        email: 'arjun@prop.internal',
        role: 'Trader',
        department: 'Derivatives',
        joiningDate: '2026-09-02',
        basicSalary: 90000,
        tradingPercentage: 20,
        commissionPercentage: 0,
        status: 'Active'
      });

      expect(trader.tradingPercentage).toBe(20);

      // 2. Create a trade for Arjun (Net P&L = ₹1,00,000)
      const trade = await repo.createTrade({
        staffId: trader.staffId,
        tradeDate: '2026-09-02',
        asset: 'NIFTY_FUT',
        tradeType: 'INTRADAY',
        capitalUsed: 1000000,
        entryPrice: 24500,
        exitPrice: 24600,
        quantity: 1000,
        grossProfit: 100000,
        grossLoss: 0,
        status: 'Submitted'
      });

      expect(trade.appliedPercentage).toBe(20);
      expect(trade.staffShare).toBe(20000);
      expect(trade.companyShare).toBe(80000);

      // 3. Promote Arjun and increase tradingPercentage to 30%
      await repo.updateStaff(trader.staffId, { tradingPercentage: 30 });

      const updatedTrader = await repo.getStaffById(trader.staffId);
      expect(updatedTrader?.tradingPercentage).toBe(30);

      // 4. Retrieve historical trade and verify it remains strictly 20%
      const historicalTrade = await repo.getTradeDetails(trade.tradeId);
      expect(historicalTrade?.appliedPercentage).toBe(20);
      expect(historicalTrade?.staffShare).toBe(20000);
      expect(historicalTrade?.companyShare).toBe(80000);
    });
  });

  describe('Trade Lifecycle & Automatic Commission Reconciliation', () => {
    it('progresses trade status through Submitted -> Reviewed -> Settled and auto-creates commission for positive net profit', async () => {
      const trade = await repo.createTrade({
        staffId: 'STAFF-00002',
        tradeDate: '2026-09-02',
        asset: 'BANKNIFTY_51500_CE',
        tradeType: 'OPTION',
        capitalUsed: 500000,
        entryPrice: 150,
        exitPrice: 250,
        quantity: 500,
        grossProfit: 50000,
        grossLoss: 0,
        status: 'Submitted'
      });

      // Review trade
      const reviewed = await repo.updateTradeStatus(trade.tradeId, 'Reviewed');
      expect(reviewed.status).toBe('Reviewed');

      // Settle trade
      const settleResult = await repo.settleTrade(trade.tradeId);
      expect(settleResult.trade.status).toBe('Settled');
      expect(settleResult.commission).toBeDefined();
      expect(settleResult.commission?.commissionAmount).toBe(10000); // 20% of 50000
      expect(settleResult.commission?.status).toBe('Calculated');

      // Approve Commission
      const approvedComm = await repo.updateCommissionStatus(
        settleResult.commission!.commissionId,
        'Approved'
      );
      expect(approvedComm.status).toBe('Approved');
      expect(approvedComm.approvedAt).toBeDefined();

      // Mark Commission as Paid
      const paidComm = await repo.updateCommissionStatus(
        settleResult.commission!.commissionId,
        'Paid'
      );
      expect(paidComm.status).toBe('Paid');
      expect(paidComm.paidAt).toBeDefined();
    });

    it('enforces idempotency on duplicate trade logging', async () => {
      const requestId = 'REQ-TRD-IDEMP-001';

      const trade1 = await repo.createTrade(
        {
          staffId: 'STAFF-00002',
          tradeDate: '2026-09-02',
          asset: 'CRUDEOIL_M',
          tradeType: 'SWING',
          capitalUsed: 1000000,
          entryPrice: 6200,
          exitPrice: 6300,
          quantity: 100,
          grossProfit: 10000,
          grossLoss: 0,
          status: 'Submitted'
        },
        requestId
      );

      const trade2 = await repo.createTrade(
        {
          staffId: 'STAFF-00002',
          tradeDate: '2026-09-02',
          asset: 'CRUDEOIL_M',
          tradeType: 'SWING',
          capitalUsed: 1000000,
          entryPrice: 6200,
          exitPrice: 6300,
          quantity: 100,
          grossProfit: 10000,
          grossLoss: 0,
          status: 'Submitted'
        },
        requestId
      );

      expect(trade1.tradeId).toBe(trade2.tradeId);
    });
  });

  describe('Staff Performance Aggregations', () => {
    it('aggregates staff win rate and total net P&L correctly', async () => {
      const details = await repo.getStaffDetails('STAFF-00002');
      expect(details.staff.name).toBe('Vikram Sharma');
      expect(details.metrics.totalTrades).toBeGreaterThanOrEqual(2);
      expect(details.metrics.winningTrades).toBeGreaterThanOrEqual(2);
      expect(details.metrics.winRate).toBe(100);
      expect(details.metrics.totalNetPnL).toBe(225000);
      expect(details.metrics.totalStaffShare).toBe(45000);
      expect(details.metrics.totalCompanyShare).toBe(180000);
    });
  });
});
