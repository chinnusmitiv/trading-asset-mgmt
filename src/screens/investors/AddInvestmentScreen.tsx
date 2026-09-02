import React, { useState } from 'react';
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
import { PercentageInput } from '../../components/common/PercentageInput';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { PaymentFrequency } from '../../types';
import { calculateInvestorMonthlyReturn } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';

export const AddInvestmentScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { investorId } = route.params;

  const [principalAmount, setPrincipalAmount] = useState<number>(5000000); // 50 Lakhs default
  const [returnPercentage, setReturnPercentage] = useState<number>(2.5); // 2.5% default
  const [frequency, setFrequency] = useState<PaymentFrequency>('Monthly');
  const [investmentDate, setInvestmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Real-time calculation of expected monthly return
  const computedReturn = calculateInvestorMonthlyReturn(
    principalAmount,
    returnPercentage,
    frequency
  );

  const handleSave = async () => {
    if (principalAmount <= 0) {
      Alert.alert('Validation Error', 'Principal amount must be greater than zero.');
      return;
    }
    if (returnPercentage < 0 || returnPercentage > 100) {
      Alert.alert('Validation Error', 'Return percentage must be between 0 and 100.');
      return;
    }

    setLoading(true);
    try {
      const created = await repository.createInvestment({
        investorId,
        principalAmount,
        investmentDate,
        maturityDate: maturityDate.trim() || undefined,
        returnPercentage,
        monthlyReturn: computedReturn,
        paymentFrequency: frequency,
        status: 'Active',
        notes: notes.trim() || undefined,
        createdBy: user?.userId || 'USR-00001'
      });

      Alert.alert(
        'Investment Tranche Created',
        `Tranche ${created.investmentId} added with ${formatCurrency(created.monthlyReturn)}/mo payout.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create investment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Add Investment Tranche"
        subtitle={`Investor Account: ${investorId}`}
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Dynamic Real-Time Estimation Highlight Card */}
          <View style={styles.estimationBanner}>
            <Text style={styles.estimationTitle}>COMPUTED EXPECTED RETURN</Text>
            <Text style={styles.estimationValue}>{formatCurrency(computedReturn)}</Text>
            <Text style={styles.estimationSubtitle}>
              {frequency} payout calculated on {formatCurrency(principalAmount)} @ {returnPercentage}% / month
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>TRANCHE SPECIFICATIONS</Text>

            <CurrencyInput
              label="Principal Investment Amount *"
              value={principalAmount}
              onChangeValue={setPrincipalAmount}
              placeholder="50,00,000"
            />

            <PercentageInput
              label="Agreed Monthly Return Percentage *"
              value={returnPercentage}
              onChangeValue={setReturnPercentage}
              placeholder="2.5"
            />

            {/* Payment Frequency Selector */}
            <Text style={styles.inputLabel}>Payout Frequency</Text>
            <View style={styles.frequencyRow}>
              {(['Monthly', 'Quarterly', 'Annual', 'On_Maturity'] as PaymentFrequency[]).map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.freqBtn,
                    frequency === freq && styles.freqBtnActive
                  ]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.freqBtnText,
                      frequency === freq && styles.freqBtnTextActive
                    ]}
                  >
                    {freq.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Deposit / Start Date (YYYY-MM-DD) *"
              value={investmentDate}
              onChangeText={setInvestmentDate}
              placeholder="2026-09-02"
            />

            <Input
              label="Lock-in Maturity Date (YYYY-MM-DD)"
              value={maturityDate}
              onChangeText={setMaturityDate}
              placeholder="2028-09-02 (Optional)"
            />

            <Input
              label="Tranche Notes / Special Terms"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Tranche B Lock-in 2 Years"
            />
          </View>

          <Button
            title="Create Investment Tranche"
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
  estimationBanner: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  estimationTitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  estimationValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '800',
    color: THEME.colors.accent.emerald,
    marginVertical: 4
  },
  estimationSubtitle: {
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
  inputLabel: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginTop: THEME.spacing.sm,
    marginBottom: 6
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  freqBtnActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  freqBtnText: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    fontWeight: '700'
  },
  freqBtnTextActive: {
    color: '#FFF'
  },
  saveBtn: {
    marginTop: THEME.spacing.xs
  }
});
