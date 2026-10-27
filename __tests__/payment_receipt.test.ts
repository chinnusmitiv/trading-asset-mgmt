import {
  generateReceiptHtml,
  createWhatsAppReceiptMessage,
  ReceiptData,
  generatePaymentReceiptPdf,
  sendReceiptOverWhatsApp,
  shareReceiptPdf
} from '../src/services/receipt/receiptGenerator';
import { formatPhoneForWhatsApp } from '../src/utils/phone';
import { Investor, InvestorPayment, Investment, InvestorBank } from '../src/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';

// Mock expo-print, expo-sharing, and react-native Linking
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock/receipt.pdf', numberOfPages: 1 })
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined)
}));

describe('Payment Receipt PDF & WhatsApp Dispatch Suite', () => {
  const mockInvestor: Investor = {
    investorId: 'INV-00001',
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    email: 'rajesh.sharma@example.com',
    address: 'Bandra West, Mumbai',
    joiningDate: '2025-01-15',
    status: 'Active',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  };

  const mockBank: InvestorBank = {
    bankId: 'BNK-00001',
    investorId: 'INV-00001',
    accountHolderName: 'Rajesh Sharma',
    bankName: 'HDFC Bank',
    accountNumberMasked: 'XXXX XXXX 4582',
    ifscCode: 'HDFC0001234',
    accountType: 'Savings',
    isPrimary: true,
    createdAt: '2025-01-15T00:00:00Z'
  };

  const mockInvestment: Investment = {
    investmentId: 'INV-TRANCHE-001',
    investorId: 'INV-00001',
    principalAmount: 5000000,
    investmentDate: '2025-01-15',
    returnPercentage: 2.5,
    monthlyReturn: 125000,
    paymentFrequency: 'Monthly',
    status: 'Active',
    createdAt: '2025-01-15T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  };

  const mockPayment: InvestorPayment = {
    paymentId: 'PAY-100452',
    investorId: 'INV-00001',
    investmentId: 'INV-TRANCHE-001',
    paymentDate: '2026-09-02',
    paymentMonth: '2026-09',
    principalAmount: 0,
    profitAmount: 125000,
    otherAmount: 5000,
    totalAmount: 130000,
    paymentMethod: 'Bank_Transfer',
    paymentReference: 'UTR20260902HDFC99812',
    status: 'Paid',
    notes: 'September profit disbursement with performance incentive',
    createdAt: '2026-09-02T10:00:00Z'
  };

  const sampleReceiptData: ReceiptData = {
    payment: mockPayment,
    investor: mockInvestor,
    investment: mockInvestment,
    bank: mockBank
  };

  describe('Receipt HTML Template Generation', () => {
    it('contains all essential disbursement, investor, and bank audit trail metadata', () => {
      const html = generateReceiptHtml(sampleReceiptData);

      // Voucher details
      expect(html).toContain('PAY-100452');
      expect(html).toContain('2026-09');
      expect(html).toContain('Bank Transfer');
      expect(html).toContain('UTR20260902HDFC99812');

      // Investor Details
      expect(html).toContain('Rajesh Sharma');
      expect(html).toContain('INV-00001');
      expect(html).toContain('HDFC Bank');
      expect(html).toContain('XXXX XXXX 4582');

      // Company branding & logo
      expect(html).toContain('VANTARA TRADING COMPANY');
      expect(html).toContain('class="company-logo"');
      expect(html).toContain('class="seal-logo"');
      expect(html).toContain('data:image/png;base64,');

      // Itemized amounts
      expect(html).toContain('1,25,000'); // Profit
      expect(html).toContain('5,000'); // Other bonus
      expect(html).toContain('1,30,000'); // Total
    });

    it('renders principal repayment row when principal amount is greater than zero', () => {
      const paymentWithPrincipal: InvestorPayment = {
        ...mockPayment,
        principalAmount: 1000000,
        totalAmount: 1125000
      };

      const html = generateReceiptHtml({
        ...sampleReceiptData,
        payment: paymentWithPrincipal
      });

      expect(html).toContain('Principal Capital Repayment');
      expect(html).toContain('10,00,000');
    });
  });

  describe('WhatsApp Receipt Message Formatting', () => {
    it('formats a structured message with clean markdown and total payout amount', () => {
      const message = createWhatsAppReceiptMessage(sampleReceiptData);

      expect(message).toContain('*DISBURSEMENT RECEIPT*');
      expect(message).toContain('Dear *Rajesh Sharma*');
      expect(message).toContain('PAY-100452');
      expect(message).toContain('2026-09');
      expect(message).toContain('TOTAL DISBURSED:');
      expect(message).toContain('UTR20260902HDFC99812');
      expect(message).toContain('HDFC Bank');
    });
  });

  describe('Phone Sanitization for WhatsApp URLs', () => {
    it('normalizes 10-digit Indian phone numbers with 91 prefix', () => {
      expect(formatPhoneForWhatsApp('9876543210')).toBe('919876543210');
      expect(formatPhoneForWhatsApp('+91 98765 43210')).toBe('919876543210');
      expect(formatPhoneForWhatsApp('91-9876543210')).toBe('919876543210');
    });

    it('handles numbers already starting with 91 cleanly', () => {
      expect(formatPhoneForWhatsApp('919876543210')).toBe('919876543210');
    });

    it('gracefully handles missing or spreadsheet error phone values', () => {
      expect(formatPhoneForWhatsApp(null)).toBe('');
      expect(formatPhoneForWhatsApp(undefined)).toBe('');
      expect(formatPhoneForWhatsApp('#ERROR!')).toBe('');
      expect(formatPhoneForWhatsApp('')).toBe('');
    });
  });

  describe('PDF Generation and Sharing Invocation', () => {
    it('calls expo-print to compile HTML to a local PDF file', async () => {
      const result = await generatePaymentReceiptPdf(sampleReceiptData);
      expect(Print.printToFileAsync).toHaveBeenCalled();
      expect(result.uri).toBe('file:///mock/receipt.pdf');
    });

    it('shares the generated PDF receipt via expo-sharing', async () => {
      const success = await shareReceiptPdf('file:///mock/receipt.pdf');
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'file:///mock/receipt.pdf',
        expect.objectContaining({
          mimeType: 'application/pdf',
          dialogTitle: 'Share Payment Receipt'
        })
      );
      expect(success).toBe(true);
    });

    it('triggers Linking.openURL with WhatsApp deep link when sending to investor', async () => {
      const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
      const canOpenURLSpy = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);

      const success = await sendReceiptOverWhatsApp({
        phone: mockInvestor.phone,
        message: 'Disbursement test receipt'
      });

      expect(canOpenURLSpy).toHaveBeenCalled();
      expect(openURLSpy).toHaveBeenCalledWith(
        expect.stringContaining('whatsapp://send?phone=919876543210&text=')
      );
      expect(success).toBe(true);

      openURLSpy.mockRestore();
      canOpenURLSpy.mockRestore();
    });
  });
});
