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
  TouchableOpacity
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { Investment, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { getCurrentMonthPeriod } from '../../utils/date';

export const RecordPaymentScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { investorId, investmentId: defaultInvestmentId } = route.params;

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

  useEffect(() => {
    loadTranches();
  }, [investorId]);

  const loadTranches = async () => {
    try {
      const details = await repository.getInvestorDetails(investorId);
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

      Alert.alert(
        'Payment Recorded',
        `Disbursement of ${formatCurrency(payment.totalAmount)} recorded under ID ${payment.paymentId}.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
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
                {investments.map(inv => (
                  <TouchableOpacity
                    key={inv.investmentId}
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
  }
});
