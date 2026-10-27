import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { Investment, Investor, InvestorBank, InvestorPayment, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { getCurrentMonthPeriod, formatDate } from '../../utils/date';
import { formatPhoneNumber } from '../../utils/phone';
import {
  generatePaymentReceiptPdf,
  createWhatsAppReceiptMessage,
  sendReceiptOverWhatsApp,
  shareReceiptPdf,
  ReceiptData
} from '../../services/receipt/receiptGenerator';

export const RecordPaymentScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { investorId, investmentId: defaultInvestmentId } = route.params;

  const [investor, setInvestor] = useState<Investor | null>(null);
  const [bank, setBank] = useState<InvestorBank | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string>(defaultInvestmentId || '');
  const [paymentMonth, setPaymentMonth] = useState<string>(getCurrentMonthPeriod());
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [profitAmount, setProfitAmount] = useState<number>(0);
  const [principalAmount, setPrincipalAmount] = useState<number>(0);
  const [otherAmount, setOtherAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank_Transfer');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Success & Receipt Dispatch Modal
  const [successModalVisible, setSuccessModalVisible] = useState<boolean>(false);
  const [recordedPayment, setRecordedPayment] = useState<InvestorPayment | null>(null);
  const [receiptPdfUri, setReceiptPdfUri] = useState<string | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<boolean>(false);

  useEffect(() => {
    loadTranches();
  }, [investorId]);

  const loadTranches = async () => {
    try {
      const details = await repository.getInvestorDetails(investorId);
      setInvestor(details.investor);
      setBank(details.bank || details.banks?.[0] || null);
      setInvestments(details.investments);
      if (!selectedInvestmentId && details.investments.length > 0) {
        setSelectedInvestmentId(details.investments[0].investmentId);
        setProfitAmount(details.investments[0].monthlyReturn);
      }
    } catch (e) {
      // Ignore
    }
  };

  const handleSelectTranche = (inv: Investment) => {
    setSelectedInvestmentId(inv.investmentId);
    setProfitAmount(inv.monthlyReturn);
  };

  // Invariant formula: total = principal + profit + other
  const totalAmount = Number(((principalAmount || 0) + (profitAmount || 0) + (otherAmount || 0)).toFixed(2));

  const handleSave = async () => {
    if (!selectedInvestmentId) {
      Alert.alert('Validation Error', 'Please select an investment tranche.');
      return;
    }
    if (totalAmount <= 0) {
      Alert.alert('Validation Error', 'Total disbursement amount must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const requestId = 'REQ-DISB-' + Date.now();
      const payment = await repository.recordPayment(
        {
          investorId,
          investmentId: selectedInvestmentId,
          paymentDate,
          paymentMonth,
          principalAmount,
          profitAmount,
          otherAmount,
          totalAmount,
          paymentMethod,
          paymentReference: paymentReference.trim() || undefined,
          status: 'Pending',
          notes: notes.trim() || undefined,
          createdBy: user?.userId || 'USR-00001'
        },
        requestId
      );

      // Construct receipt data
      const targetInvestor: Investor = investor || {
        investorId,
        name: 'Valued Investor',
        phone: '',
        joiningDate: '',
        status: 'Active',
        createdAt: '',
        updatedAt: ''
      };

      const matchedInvestment = investments.find(inv => inv.investmentId === selectedInvestmentId);

      const receiptPayload: ReceiptData = {
        payment,
        investor: targetInvestor,
        investment: matchedInvestment,
        bank: bank || undefined
      };

      // Automatically generate professional PDF receipt
      let generatedPdf: string | null = null;
      try {
        const pdfResult = await generatePaymentReceiptPdf(receiptPayload);
        generatedPdf = pdfResult.uri;
      } catch (pdfErr) {
        console.warn('PDF Receipt compilation error:', pdfErr);
      }

      setRecordedPayment(payment);
      setReceiptPdfUri(generatedPdf);
      setSuccessModalVisible(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!recordedPayment || !investor) return;
    setIsSendingWhatsApp(true);
    try {
      const matchedInvestment = investments.find(inv => inv.investmentId === recordedPayment.investmentId);
      const receiptPayload: ReceiptData = {
        payment: recordedPayment,
        investor,
        investment: matchedInvestment,
        bank: bank || undefined
      };

      const message = createWhatsAppReceiptMessage(receiptPayload);
      await sendReceiptOverWhatsApp({
        phone: investor.phone,
        message,
        pdfUri: receiptPdfUri || undefined
      });
    } catch (err: any) {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please check device connectivity.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleSharePdf = async () => {
    if (!receiptPdfUri) {
      Alert.alert('PDF Not Ready', 'Receipt PDF is still compiling or unavailable.');
      return;
    }
    await shareReceiptPdf(receiptPdfUri, 'Disbursement Receipt PDF');
  };

  const handleCloseSuccess = () => {
    setSuccessModalVisible(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Record Investor Payment"
        subtitle={`Investor Account: ${investorId}`}
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Real-time Total Disbursed Highlight Card */}
          <View style={styles.totalBanner}>
            <Text style={styles.totalBannerTitle}>TOTAL DISBURSEMENT AMOUNT</Text>
            <Text style={styles.totalBannerValue}>{formatCurrency(totalAmount)}</Text>
            <Text style={styles.totalBannerSubtitle}>
              Profit ({formatCurrency(profitAmount)}) + Principal ({formatCurrency(principalAmount)}) + Other ({formatCurrency(otherAmount)})
            </Text>
          </View>

          {/* Select Tranche */}
          {investments.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>ASSOCIATED INVESTMENT TRANCHE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trancheSelectorRow}>
                {investments.map((inv, idx) => (
                  <TouchableOpacity
                    key={inv.investmentId || (inv as any).investment_id || `tranche-${idx}`}
                    style={[
                      styles.tranchePill,
                      selectedInvestmentId === inv.investmentId && styles.tranchePillActive
                    ]}
                    onPress={() => handleSelectTranche(inv)}
                  >
                    <Text
                      style={[
                        styles.tranchePillTitle,
                        selectedInvestmentId === inv.investmentId && styles.tranchePillTextActive
                      ]}
                    >
                      {inv.investmentId}
                    </Text>
                    <Text
                      style={[
                        styles.tranchePillSub,
                        selectedInvestmentId === inv.investmentId && styles.tranchePillTextActive
                      ]}
                    >
                      {formatCurrency(inv.principalAmount)} • {inv.returnPercentage}%/mo
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Financial Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PAYMENT COMPONENT BREAKDOWN</Text>

            <CurrencyInput
              label="Profit / Return Amount *"
              value={profitAmount}
              onChangeValue={setProfitAmount}
              placeholder="0"
            />

            <CurrencyInput
              label="Principal Repayment Amount (If Returning Principal)"
              value={principalAmount}
              onChangeValue={setPrincipalAmount}
              placeholder="0"
            />

            <CurrencyInput
              label="Other Adjustments / Bonus"
              value={otherAmount}
              onChangeValue={setOtherAmount}
              placeholder="0"
            />

            <Input
              label="Billing / Settlement Month (YYYY-MM) *"
              value={paymentMonth}
              onChangeText={setPaymentMonth}
              placeholder="2026-09"
            />

            <Input
              label="Payment Date (YYYY-MM-DD) *"
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="2026-09-02"
            />
          </View>

          {/* Settlement Rails & References */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SETTLEMENT DETAILS</Text>

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {(['Bank_Transfer', 'UPI', 'Cheque', 'Cash'] as PaymentMethod[]).map(method => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodBtn,
                    paymentMethod === method && styles.methodBtnActive
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === method && styles.methodBtnTextActive
                    ]}
                  >
                    {method.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Bank Reference Number / UTR"
              value={paymentReference}
              onChangeText={setPaymentReference}
              placeholder="e.g. UTR2026090212345"
            />

            <Input
              label="Transaction Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Regular monthly interest payout"
            />
          </View>

          <Button
            title="Record Disbursement"
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Payment Success & Receipt Dispatch Modal */}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSuccess}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Header Badge */}
            <View style={styles.successIconCircle}>
              <Text style={styles.successIconText}>✓</Text>
            </View>

            <Text style={styles.modalTitle}>Disbursement Recorded!</Text>
            <Text style={styles.modalSub}>
              Voucher #{recordedPayment?.paymentId} generated successfully
            </Text>

            {/* Receipt Summary Box */}
            <View style={styles.receiptSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Investor:</Text>
                <Text style={styles.summaryValueBold}>{investor?.name || investorId}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>WhatsApp Phone:</Text>
                <Text style={styles.summaryValue}>{formatPhoneNumber(investor?.phone)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Period / Tranche:</Text>
                <Text style={styles.summaryValue}>
                  {recordedPayment?.paymentMonth} • {recordedPayment?.investmentId}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Amount Paid:</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(recordedPayment?.totalAmount || 0)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={handleSendWhatsApp}
                disabled={isSendingWhatsApp}
                activeOpacity={0.8}
              >
                {isSendingWhatsApp ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Text style={styles.whatsappIcon}>💬</Text>
                    <Text style={styles.whatsappBtnText}>Send Receipt over WhatsApp</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sharePdfBtn}
                onPress={handleSharePdf}
                activeOpacity={0.8}
              >
                <Text style={styles.sharePdfIcon}>📄</Text>
                <Text style={styles.sharePdfBtnText}>Share / Print PDF Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.doneBtn}
                onPress={handleCloseSuccess}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background.primary
  },
  container: {
    flex: 1
  },
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xxl,
    gap: THEME.spacing.md
  },
  totalBanner: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  totalBannerTitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  totalBannerValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '800',
    color: THEME.colors.accent.emerald,
    marginVertical: 4
  },
  totalBannerSubtitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    textAlign: 'center'
  },
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8,
    marginBottom: THEME.spacing.sm
  },
  trancheSelectorRow: {
    gap: 8
  },
  tranchePill: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    minWidth: 120
  },
  tranchePillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  tranchePillTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  tranchePillSub: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  tranchePillTextActive: {
    color: '#FFF'
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginTop: THEME.spacing.sm,
    marginBottom: 6
  },
  methodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  methodBtnActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  methodBtnText: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    fontWeight: '700'
  },
  methodBtnTextActive: {
    color: '#FFF'
  },
  saveBtn: {
    marginTop: THEME.spacing.xs
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  successIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: THEME.colors.accent.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md
  },
  successIconText: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.accent.emerald
  },
  modalTitle: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    marginBottom: 4,
    textAlign: 'center'
  },
  modalSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.md
  },
  receiptSummaryBox: {
    width: '100%',
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    marginBottom: THEME.spacing.lg
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  summaryLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted
  },
  summaryValue: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  summaryValueBold: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.primary,
    fontWeight: '700'
  },
  summaryTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider,
    marginBottom: 0
  },
  summaryTotalLabel: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.primary,
    fontWeight: '700'
  },
  summaryTotalValue: {
    fontSize: THEME.typography.fontSize.base,
    color: THEME.colors.accent.emerald,
    fontWeight: '800'
  },
  modalActions: {
    width: '100%',
    gap: 10
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  whatsappIcon: {
    fontSize: 18,
    marginRight: 8
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: THEME.typography.fontSize.sm,
    letterSpacing: 0.2
  },
  sharePdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  sharePdfIcon: {
    fontSize: 16,
    marginRight: 8
  },
  sharePdfBtnText: {
    color: THEME.colors.accent.indigo,
    fontWeight: '700',
    fontSize: THEME.typography.fontSize.sm
  },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 10
  },
  doneBtnText: {
    color: THEME.colors.text.muted,
    fontWeight: '600',
    fontSize: THEME.typography.fontSize.sm
  }
});
