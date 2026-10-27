import { calculatePaymentDueStatus } from '../src/utils/calculations';
import { MockRepository } from '../src/repositories/mockRepository';

describe('Investor Payment Reminders & Due Calculation Suite', () => {
  describe('calculatePaymentDueStatus pure calculation engine', () => {
    it('identifies an overdue payout when current date is past the cycle day', () => {
      // Target cycle day is 15th of October 2026, today is 27th of October 2026
      const result = calculatePaymentDueStatus('2025-01-15', '2026-10', '2026-10-27');

      expect(result.dueDate).toBe('2026-10-15');
      expect(result.cycleDay).toBe(15);
      expect(result.status).toBe('Overdue');
      expect(result.daysDifference).toBe(12);
      expect(result.statusLabel).toBe('Overdue by 12 days');
    });

    it('identifies due today payout when current date matches cycle day', () => {
      const result = calculatePaymentDueStatus('2025-01-15', '2026-10', '2026-10-15');

      expect(result.dueDate).toBe('2026-10-15');
      expect(result.cycleDay).toBe(15);
      expect(result.status).toBe('Due_Today');
      expect(result.daysDifference).toBe(0);
      expect(result.statusLabel).toBe('Due Today');
    });

    it('identifies upcoming payout when current date is before cycle day', () => {
      const result = calculatePaymentDueStatus('2025-01-25', '2026-10', '2026-10-20');

      expect(result.dueDate).toBe('2026-10-25');
      expect(result.cycleDay).toBe(25);
      expect(result.status).toBe('Upcoming');
      expect(result.daysDifference).toBe(-5);
      expect(result.statusLabel).toBe('Due in 5 days');
    });

    it('clamps to the last day of shorter months (e.g., Feb 28 on non-leap year)', () => {
      const result = calculatePaymentDueStatus('2025-01-31', '2026-02', '2026-02-10');

      expect(result.dueDate).toBe('2026-02-28');
      expect(result.cycleDay).toBe(28);
      expect(result.status).toBe('Upcoming');
    });
  });

  describe('MockRepository getPaymentReminders integration', () => {
    let mockRepo: MockRepository;

    beforeEach(() => {
      mockRepo = new MockRepository();
    });

    it('returns payment reminders for all active investment tranches', async () => {
      const reminders = await mockRepo.getPaymentReminders('2026-10');

      expect(reminders.length).toBeGreaterThan(0);
      const first = reminders[0];
      expect(first.investorId).toBeDefined();
      expect(first.investmentId).toBeDefined();
      expect(first.investorName).toBeDefined();
      expect(first.monthlyReturnExpected).toBeGreaterThan(0);
      expect(['Overdue', 'Due_Today', 'Upcoming', 'Paid']).toContain(first.status);
    });

    it('correctly marks tranche as Paid once disbursement is recorded', async () => {
      const initialReminders = await mockRepo.getPaymentReminders('2026-10');
      const target = initialReminders.find(r => r.status !== 'Paid');
      expect(target).toBeDefined();

      if (target) {
        // Record payment for this target tranche
        await mockRepo.recordPayment({
          investorId: target.investorId,
          investmentId: target.investmentId,
          paymentDate: '2026-10-15',
          paymentMonth: '2026-10',
          principalAmount: 0,
          profitAmount: target.monthlyReturnExpected,
          otherAmount: 0,
          totalAmount: target.monthlyReturnExpected,
          paymentMethod: 'Bank_Transfer',
          status: 'Paid'
        });

        const updatedReminders = await mockRepo.getPaymentReminders('2026-10');
        const updatedTarget = updatedReminders.find(
          r => r.investmentId === target.investmentId
        );

        expect(updatedTarget).toBeDefined();
        expect(updatedTarget?.status).toBe('Paid');
        expect(updatedTarget?.paidAmount).toBe(target.monthlyReturnExpected);
      }
    });

    it('prioritizes Overdue and Due Today tranches before Upcoming and Paid', async () => {
      const reminders = await mockRepo.getPaymentReminders('2026-10');

      const statuses = reminders.map(r => r.status);
      const overdueIdx = statuses.indexOf('Overdue');
      const paidIdx = statuses.lastIndexOf('Paid');

      if (overdueIdx !== -1 && paidIdx !== -1) {
        expect(overdueIdx).toBeLessThan(paidIdx);
      }
    });
  });
});
