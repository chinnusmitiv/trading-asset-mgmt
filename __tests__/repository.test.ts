import { MockRepository } from '../src/repositories/mockRepository';

describe('Mock Repository & Data Layer', () => {
  let repo: MockRepository;

  beforeEach(() => {
    repo = new MockRepository();
  });

  it('loads seed dataset with investors and staff', async () => {
    const investors = await repo.getInvestors();
    expect(investors.length).toBeGreaterThanOrEqual(5);

    const staff = await repo.getStaffList();
    expect(staff.length).toBeGreaterThanOrEqual(3);
  });

  it('creates an investor and automatically generates sequential ID and audit log', async () => {
    const newInvestor = await repo.createInvestor({
      name: 'Test Investor HNI',
      phone: '+91 99999 88888',
      email: 'test@hni.com',
      joiningDate: '2026-09-02',
      status: 'Active'
    });

    expect(newInvestor.investorId).toMatch(/^INV-\d{5}$/);
    expect(newInvestor.name).toBe('Test Investor HNI');

    // Verify in list
    const list = await repo.getInvestors({ search: 'Test Investor HNI' });
    expect(list.length).toBe(1);

    // Verify audit log created
    const logs = await repo.getAuditLogs({ module: 'Investors' });
    expect(logs.some(l => l.recordId === newInvestor.investorId)).toBe(true);
  });

  it('creates trade with automatic financial invariant calculations', async () => {
    const trade = await repo.createTrade({
      staffId: 'STAFF-00002', // Vikram Sharma (20% cut)
      tradeDate: '2026-09-02',
      asset: 'NIFTY_FUT',
      tradeType: 'INTRADAY',
      capitalUsed: 2000000,
      entryPrice: 24500,
      exitPrice: 24600,
      quantity: 500,
      grossProfit: 50000,
      grossLoss: 0,
      status: 'Submitted'
    });

    expect(trade.netPnL).toBe(50000);
    expect(trade.staffShare).toBe(10000); // 20% of 50000
    expect(trade.companyShare).toBe(40000);
    expect(trade.roiPercentage).toBe(2.5); // (50000 / 2000000) * 100
  });

  it('enforces idempotency on financial mutations with duplicate requestId', async () => {
    const requestId = 'REQ-TEST-IDEMP-001';

    const expense1 = await repo.createExpense(
      {
        expenseDate: '2026-09-02',
        category: 'Office_Supplies',
        description: 'Idempotency Test Expense',
        amount: 5000,
        paymentMethod: 'UPI',
        status: 'Submitted'
      },
      requestId
    );

    const expense2 = await repo.createExpense(
      {
        expenseDate: '2026-09-02',
        category: 'Office_Supplies',
        description: 'Idempotency Test Expense',
        amount: 5000,
        paymentMethod: 'UPI',
        status: 'Submitted'
      },
      requestId
    );

    expect(expense1.expenseId).toBe(expense2.expenseId);
  });
});
