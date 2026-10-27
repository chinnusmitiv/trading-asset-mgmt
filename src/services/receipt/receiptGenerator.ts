/**
 * Payment Receipt PDF Generator & WhatsApp Dispatch Service
 */

import { Linking, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Investor, InvestorPayment, Investment, InvestorBank } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { formatPhoneForWhatsApp, formatPhoneNumber } from '../../utils/phone';

export interface ReceiptData {
  payment: InvestorPayment;
  investor: Investor;
  investment?: Investment;
  bank?: InvestorBank;
  companyName?: string;
}

/**
 * Builds a styled, executive-grade HTML payment receipt suitable for PDF conversion.
 */
export function generateReceiptHtml(data: ReceiptData): string {
  const {
    payment,
    investor,
    investment,
    bank,
    companyName = 'PRIME ASSET MANAGEMENT DESK'
  } = data;

  const formattedTotal = formatCurrency(payment.totalAmount);
  const formattedProfit = formatCurrency(payment.profitAmount);
  const formattedPrincipal = formatCurrency(payment.principalAmount);
  const formattedOther = formatCurrency(payment.otherAmount);
  const formattedDate = formatDate(payment.paymentDate);
  const formattedPhone = formatPhoneNumber(investor.phone);

  const bankInfoText = bank
    ? `${bank.bankName} (A/C: ${bank.accountNumberMasked})${bank.ifscCode ? ` • IFSC: ${bank.ifscCode}` : ''}`
    : 'Direct Bank Settlement';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt - ${payment.paymentId}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background-color: #f8fafc;
      color: #0f172a;
      padding: 32px;
      font-size: 13px;
      line-height: 1.5;
    }
    .receipt-container {
      max-width: 680px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #ffffff;
      padding: 28px 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-left h1 {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #ffffff;
      margin-bottom: 4px;
    }
    .header-left p {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .header-right {
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid #10b981;
      color: #34d399;
      font-size: 10px;
      font-weight: 800;
      border-radius: 9999px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .receipt-id {
      font-size: 14px;
      font-weight: 700;
      color: #f1f5f9;
    }
    .meta-bar {
      background: #f1f5f9;
      padding: 12px 32px;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
    }
    .meta-bar strong {
      color: #0f172a;
    }
    .content {
      padding: 28px 32px;
    }
    .grid-2 {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
    }
    .grid-col {
      flex: 1;
      background: #f8fafc;
      padding: 16px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }
    .col-title {
      font-size: 10px;
      font-weight: 800;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 10px;
    }
    .info-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .info-line:last-child {
      margin-bottom: 0;
    }
    .info-label {
      color: #64748b;
    }
    .info-value {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
    }
    .table-container {
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #f8fafc;
      text-align: left;
      padding: 10px 14px;
      font-weight: 700;
      color: #475569;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    th:last-child, td:last-child {
      text-align: right;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .amount-highlight {
      font-weight: 700;
      color: #0f172a;
    }
    .total-banner {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .total-title {
      font-size: 12px;
      font-weight: 800;
      color: #065f46;
      letter-spacing: 0.5px;
    }
    .total-sub {
      font-size: 10px;
      color: #047857;
      margin-top: 2px;
    }
    .total-value {
      font-size: 24px;
      font-weight: 800;
      color: #059669;
      letter-spacing: -0.5px;
    }
    .settlement-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      color: #94a3b8;
      font-size: 10px;
    }
    .signature-box {
      text-align: right;
    }
    .signature-line {
      width: 140px;
      border-bottom: 1px solid #94a3b8;
      margin-bottom: 4px;
      margin-left: auto;
    }
    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="header-left">
        <h1>${companyName}</h1>
        <p>OFFICIAL DISBURSEMENT RECEIPT</p>
      </div>
      <div class="header-right">
        <span class="badge">Disbursed</span>
        <div class="receipt-id">${payment.paymentId}</div>
      </div>
    </div>

    <div class="meta-bar">
      <div>Payment Date: <strong>${formattedDate}</strong></div>
      <div>Settlement Period: <strong>${payment.paymentMonth}</strong></div>
      <div>Mode: <strong>${payment.paymentMethod.replace('_', ' ')}</strong></div>
    </div>

    <div class="content">
      <!-- Beneficiary & Tranche Grid -->
      <div class="grid-2">
        <div class="grid-col">
          <div class="col-title">Investor Beneficiary</div>
          <div class="info-line">
            <span class="info-label">Name:</span>
            <span class="info-value">${investor.name}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Investor ID:</span>
            <span class="info-value">${investor.investorId}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Phone:</span>
            <span class="info-value">${formattedPhone}</span>
          </div>
          ${investor.email ? `
          <div class="info-line">
            <span class="info-label">Email:</span>
            <span class="info-value">${investor.email}</span>
          </div>` : ''}
          <div class="info-line">
            <span class="info-label">Bank:</span>
            <span class="info-value">${bankInfoText}</span>
          </div>
        </div>

        <div class="grid-col">
          <div class="col-title">Investment Tranche Info</div>
          <div class="info-line">
            <span class="info-label">Tranche ID:</span>
            <span class="info-value">${payment.investmentId}</span>
          </div>
          ${investment ? `
          <div class="info-line">
            <span class="info-label">Principal Base:</span>
            <span class="info-value">${formatCurrency(investment.principalAmount)}</span>
          </div>
          <div class="info-line">
            <span class="info-label">Agreed Rate:</span>
            <span class="info-value">${investment.returnPercentage}% / month</span>
          </div>
          ` : ''}
          <div class="info-line">
            <span class="info-label">Disbursement Status:</span>
            <span class="info-value" style="color: #059669;">Recorded / Verified</span>
          </div>
        </div>
      </div>

      <!-- Itemized Breakdown Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Component Description</th>
              <th>Period</th>
              <th>Disbursed Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Monthly Return / Profit Payout</strong>
                <div style="font-size: 10px; color: #64748b;">Agreed investment return distribution</div>
              </td>
              <td>${payment.paymentMonth}</td>
              <td class="amount-highlight">${formattedProfit}</td>
            </tr>
            ${payment.principalAmount > 0 ? `
            <tr>
              <td>
                <strong>Principal Capital Repayment</strong>
                <div style="font-size: 10px; color: #64748b;">Tranche principal return</div>
              </td>
              <td>—</td>
              <td class="amount-highlight">${formattedPrincipal}</td>
            </tr>` : ''}
            ${payment.otherAmount > 0 ? `
            <tr>
              <td>
                <strong>Adjustments / Bonus Payout</strong>
                <div style="font-size: 10px; color: #64748b;">Special incentive or adjustment</div>
              </td>
              <td>—</td>
              <td class="amount-highlight">${formattedOther}</td>
            </tr>` : ''}
          </tbody>
        </table>
      </div>

      <!-- Total Banner -->
      <div class="total-banner">
        <div>
          <div class="total-title">TOTAL DISBURSED AMOUNT</div>
          <div class="total-sub">Net payout credited to beneficiary account</div>
        </div>
        <div class="total-value">${formattedTotal}</div>
      </div>

      <!-- Settlement Reference Box -->
      <div class="settlement-card">
        <div class="col-title" style="color: #0f172a; margin-bottom: 8px;">Settlement & Audit Trail</div>
        <div class="info-line">
          <span class="info-label">Payment Channel:</span>
          <span class="info-value">${payment.paymentMethod.replace('_', ' ')}</span>
        </div>
        <div class="info-line">
          <span class="info-label">Bank Reference / UTR:</span>
          <span class="info-value" style="font-family: monospace; color: #4338ca;">${payment.paymentReference || 'Direct Internal Transfer'}</span>
        </div>
        ${payment.notes ? `
        <div class="info-line">
          <span class="info-label">Voucher Notes:</span>
          <span class="info-value">${payment.notes}</span>
        </div>` : ''}
      </div>

      <!-- Footer / Seal -->
      <div class="footer">
        <div>
          <p>This is an authentic computer-generated payment voucher.</p>
          <p>Generated on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} • Voucher ID: ${payment.paymentId}</p>
        </div>
        <div class="signature-box">
          <div class="signature-line"></div>
          <p style="font-weight: 700; color: #475569;">Authorized Signatory</p>
          <p style="font-size: 9px;">${companyName}</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Compiles and generates a local PDF receipt document using Expo Print.
 */
export async function generatePaymentReceiptPdf(data: ReceiptData): Promise<{ uri: string }> {
  const html = generateReceiptHtml(data);
  const file = await Print.printToFileAsync({
    html,
    base64: false
  });
  return { uri: file.uri };
}

/**
 * Creates a clean, formatted WhatsApp message for the investor.
 */
export function createWhatsAppReceiptMessage(data: ReceiptData): string {
  const { payment, investor, bank } = data;

  const totalFormatted = formatCurrency(payment.totalAmount);
  const profitFormatted = formatCurrency(payment.profitAmount);
  const principalFormatted = formatCurrency(payment.principalAmount);
  const otherFormatted = formatCurrency(payment.otherAmount);
  const formattedDate = formatDate(payment.paymentDate);

  let msg = `*DISBURSEMENT RECEIPT*\n`;
  msg += `*Asset Management Operations*\n`;
  msg += `-----------------------------------------\n`;
  msg += `Dear *${investor.name}*,\n\n`;
  msg += `We are pleased to confirm that your disbursement has been successfully recorded and processed.\n\n`;
  msg += `*Receipt Details:*\n`;
  msg += `• *Voucher No:* ${payment.paymentId}\n`;
  msg += `• *Date:* ${formattedDate}\n`;
  msg += `• *Settlement Month:* ${payment.paymentMonth}\n`;
  msg += `• *Investment Tranche:* ${payment.investmentId}\n\n`;
  msg += `*Disbursement Breakdown:*\n`;
  msg += `• Profit Payout: ${profitFormatted}\n`;
  if (payment.principalAmount > 0) {
    msg += `• Principal Returned: ${principalFormatted}\n`;
  }
  if (payment.otherAmount > 0) {
    msg += `• Adjustments / Bonus: ${otherFormatted}\n`;
  }
  msg += `-----------------------------------------\n`;
  msg += `*TOTAL DISBURSED: ${totalFormatted}*\n`;
  msg += `-----------------------------------------\n\n`;
  msg += `*Settlement Info:*\n`;
  msg += `• *Payment Rail:* ${payment.paymentMethod.replace('_', ' ')}\n`;
  if (payment.paymentReference) {
    msg += `• *UTR / Ref:* ${payment.paymentReference}\n`;
  }
  if (bank) {
    msg += `• *Credit Account:* ${bank.bankName} (${bank.accountNumberMasked})\n`;
  }
  msg += `\n_Official PDF payment voucher generated and ready for your records._\n`;
  msg += `\nThank you for your valued partnership.`;

  return msg;
}

/**
 * Shares the PDF receipt file using the system share sheet (WhatsApp, Email, Files, etc.).
 */
export async function shareReceiptPdf(pdfUri: string, dialogTitle: string = 'Share Payment Receipt'): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle,
        UTI: 'com.adobe.pdf'
      });
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Share receipt failed:', error);
    return false;
  }
}

/**
 * Opens WhatsApp directly with a pre-filled message, and optionally triggers PDF sharing.
 */
export async function sendReceiptOverWhatsApp(options: {
  phone: string;
  message: string;
  pdfUri?: string;
}): Promise<boolean> {
  const { phone, message, pdfUri } = options;
  const cleanPhone = formatPhoneForWhatsApp(phone);

  const encodedMessage = encodeURIComponent(message);
  const nativeUrl = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`
    : `whatsapp://send?text=${encodedMessage}`;
  const webUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  try {
    if (Platform.OS !== 'web') {
      const canOpen = await Linking.canOpenURL(nativeUrl);
      if (canOpen) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } else {
      await Linking.openURL(webUrl);
    }

    // If PDF URI is available, also launch native share sheet so user can attach file
    if (pdfUri) {
      setTimeout(() => {
        shareReceiptPdf(pdfUri, 'Attach PDF Receipt to WhatsApp');
      }, 800);
    }
    return true;
  } catch (err) {
    console.warn('Failed to open WhatsApp URL:', err);
    // Fallback directly to sharing PDF if WhatsApp deep link fails
    if (pdfUri) {
      await shareReceiptPdf(pdfUri, 'Share Receipt via WhatsApp');
    }
    return false;
  }
}
