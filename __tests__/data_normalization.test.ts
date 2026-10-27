import { normalizeAppsScriptResponse, snakeToCamel } from '../src/utils/dataNormalization';
import { ApiClient } from '../src/services/api/apiClient';

describe('Data Normalization Utility', () => {
  it('converts snake_case strings to camelCase', () => {
    expect(snakeToCamel('investor_id')).toBe('investorId');
    expect(snakeToCamel('joining_date')).toBe('joiningDate');
    expect(snakeToCamel('net_pnl')).toBe('netPnl');
    expect(snakeToCamel('account_number_masked')).toBe('accountNumberMasked');
    expect(snakeToCamel('status')).toBe('status');
  });

  it('normalizes single snake_case object while preserving original keys', () => {
    const raw = {
      investor_id: 'INV-1001',
      name: 'Sarah Jenkins',
      phone: '+91 98765 43210',
      joining_date: '2024-01-15',
      status: 'Active'
    };

    const normalized = normalizeAppsScriptResponse(raw);

    // camelCase access
    expect(normalized.investorId).toBe('INV-1001');
    expect(normalized.joiningDate).toBe('2024-01-15');
    expect(normalized.name).toBe('Sarah Jenkins');

    // snake_case preserved
    expect(normalized.investor_id).toBe('INV-1001');
    expect(normalized.joining_date).toBe('2024-01-15');
  });

  it('normalizes an array of objects (as returned by readRows / list endpoints)', () => {
    const rawArray = [
      { staff_id: 'STAFF-1', name: 'John Trader', trading_percentage: 20 },
      { staff_id: 'STAFF-2', name: 'Alice Manager', trading_percentage: 0 }
    ];

    const normalized = normalizeAppsScriptResponse(rawArray);

    expect(Array.isArray(normalized)).toBe(true);
    expect(normalized.length).toBe(2);
    expect(normalized[0].staffId).toBe('STAFF-1');
    expect(normalized[0].tradingPercentage).toBe(20);
    expect(normalized[1].staffId).toBe('STAFF-2');
  });

  it('handles net_pnl mapping to netPnL and netPnl', () => {
    const rawTrade = {
      trade_id: 'TRD-500',
      gross_profit: 50000,
      gross_loss: 10000,
      net_pnl: 40000
    };

    const normalized = normalizeAppsScriptResponse(rawTrade);

    expect(normalized.tradeId).toBe('TRD-500');
    expect(normalized.grossProfit).toBe(50000);
    expect(normalized.grossLoss).toBe(10000);
    expect(normalized.netPnL).toBe(40000);
    expect(normalized.netPnl).toBe(40000);
    expect(normalized.net_pnl).toBe(40000);
  });

  it('handles is_primary string booleans from Google Sheets', () => {
    const rawBank = {
      bank_id: 'BANK-1',
      is_primary: 'TRUE'
    };

    const normalized = normalizeAppsScriptResponse(rawBank);

    expect(normalized.bankId).toBe('BANK-1');
    expect(normalized.isPrimary).toBe(true);
  });

  it('handles nested objects recursively (such as investor details)', () => {
    const rawDetails = {
      investor: { investor_id: 'INV-1', name: 'Investor One' },
      investments: [
        { investment_id: 'INVT-1', principal_amount: 500000 },
        { investment_id: 'INVT-2', principal_amount: 1000000 }
      ],
      payments: [
        { payment_id: 'PAY-1', payment_month: '2026-09' }
      ]
    };

    const normalized = normalizeAppsScriptResponse(rawDetails);

    expect(normalized.investor.investorId).toBe('INV-1');
    expect(normalized.investments[0].investmentId).toBe('INVT-1');
    expect(normalized.investments[0].principalAmount).toBe(500000);
    expect(normalized.payments[0].paymentId).toBe('PAY-1');
    expect(normalized.payments[0].paymentMonth).toBe('2026-09');
  });

  it('safely handles null and primitives', () => {
    expect(normalizeAppsScriptResponse(null)).toBeNull();
    expect(normalizeAppsScriptResponse(undefined)).toBeUndefined();
    expect(normalizeAppsScriptResponse(42)).toBe(42);
    expect(normalizeAppsScriptResponse('test')).toBe('test');
  });
});

describe('ApiClient automatic response normalization', () => {
  it('normalizes json.data in successful API responses', async () => {
    const client = new ApiClient('https://mock-endpoint.internal');

    // Mock global fetch
    const mockData = [
      { investor_id: 'INV-10', name: 'Test Investor', joining_date: '2026-01-01' }
    ];

    (globalThis as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockData,
        message: 'OK',
        requestId: 'REQ-123'
      })
    } as any);

    const res = await client.request('investors.list');

    expect(res.success).toBe(true);
    expect(res.data[0].investorId).toBe('INV-10');
    expect(res.data[0].joiningDate).toBe('2026-01-01');
    expect(res.data[0].investor_id).toBe('INV-10');
  });
});
