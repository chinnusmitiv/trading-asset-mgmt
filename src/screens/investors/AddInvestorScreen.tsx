import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { PercentageInput } from '../../components/common/PercentageInput';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { calculateInvestorMonthlyReturn } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';

export const AddInvestorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();

  // Contact Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Initial Investment & Return Percentage
  const [initialPrincipal, setInitialPrincipal] = useState<number>(5000000); // 50 Lakhs
  const [returnPercentage, setReturnPercentage] = useState<number>(2.5); // 2.5% per month
  const [maturityDate, setMaturityDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time calculation of expected monthly return
  const expectedMonthlyPayout = calculateInvestorMonthlyReturn(
    initialPrincipal,
    returnPercentage,
    'Monthly'
  );

  const validate = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Full legal name is required';
    if (!phone.trim() || phone.trim() === '+91') errs.phone = 'Valid phone number is required';
    if (email.trim() && !email.includes('@')) errs.email = 'Valid email format required';

    if (initialPrincipal < 0) {
      errs.principal = 'Initial principal cannot be negative';
    }
    if (returnPercentage < 0 || returnPercentage > 100) {
      errs.percentage = 'Return percentage must be between 0% and 100%';
    }

    // Duplicate check
    if (!errs.phone) {
      const existing = await repository.getInvestors();
      const duplicate = existing.find(
        i => i.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')
      );
      if (duplicate) {
        errs.phone = `Phone already registered to ${duplicate.name} (${duplicate.investorId})`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    const isValid = await validate();
    if (!isValid) return;

    setLoading(true);
    try {
      // 1. Create Investor
      const created = await repository.createInvestor({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        joiningDate: joiningDate.trim(),
        status: 'Active',
        notes: notes.trim() || undefined
      });

      // 2. If Initial Principal is provided (> 0), automatically create Initial Investment Tranche
      if (initialPrincipal > 0) {
        await repository.createInvestment({
          investorId: created.investorId,
          principalAmount: initialPrincipal,
          investmentDate: joiningDate.trim(),
          maturityDate: maturityDate.trim() || undefined,
          returnPercentage: returnPercentage,
          monthlyReturn: expectedMonthlyPayout,
          paymentFrequency: 'Monthly',
          status: 'Active',
          notes: 'Initial Capital Allocation',
          createdBy: user?.userId || 'USR-00001'
        });
      }

      Alert.alert(
        'Investor Registered',
        `Successfully onboarded ${created.name} (${created.investorId}) with ${formatCurrency(expectedMonthlyPayout)}/month expected payout.`,
        [
          {
            text: 'Open Investor Portfolio',
            onPress: () => {
              navigation.replace('InvestorDetails', { investorId: created.investorId });
            }
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create investor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Onboard Investor" subtitle="Create Capital Account & Set Return %" user={user} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Live Expected Return Highlight Banner */}
          {initialPrincipal > 0 && (
            <View style={styles.payoutBanner}>
              <Text style={styles.payoutBannerTitle}>EXPECTED MONTHLY PAYOUT</Text>
              <Text style={styles.payoutBannerValue}>{formatCurrency(expectedMonthlyPayout)}</Text>
              <Text style={styles.payoutBannerSub}>
                {returnPercentage}% per month on {formatCurrency(initialPrincipal)} principal
              </Text>
            </View>
          )}

          {/* Capital & Agreed Return Percentage */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>CAPITAL ALLOCATION & RETURN PERCENTAGE</Text>

            <CurrencyInput
              label="Initial Capital Investment Principal (₹) *"
              value={initialPrincipal}
              onChangeValue={setInitialPrincipal}
              placeholder="50,00,000"
              error={errors.principal}
            />

            <PercentageInput
              label="Agreed Monthly Return Rate (% / month) *"
              value={returnPercentage}
              onChangeValue={setReturnPercentage}
              placeholder="2.5"
              error={errors.percentage}
            />

            <Input
              label="Maturity / Lock-in Date (Optional)"
              value={maturityDate}
              onChangeText={setMaturityDate}
              placeholder="YYYY-MM-DD (e.g. 2027-09-02)"
            />
          </View>

          {/* Legal & Contact Particulars */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>LEGAL & CONTACT PARTICULARS</Text>

            <Input
              label="Full Legal Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ramesh Chandra Verma"
              error={errors.name}
            />

            <Input
              label="Primary Phone Number *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              error={errors.phone}
            />

            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="investor@example.com"
              error={errors.email}
            />

            <Input
              label="Residential / Office Address"
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. Bandra West, Mumbai"
            />

            <Input
              label="Onboarding Date (YYYY-MM-DD)"
              value={joiningDate}
              onChangeText={setJoiningDate}
              placeholder="2026-09-02"
            />

            <Input
              label="Account Notes & Investor Category"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Family Office, HNI, Direct Referral"
            />
          </View>

          <Button
            title="Register Investor & Activate Portfolio"
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
  payoutBanner: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  payoutBannerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.text.secondary,
    letterSpacing: 0.8
  },
  payoutBannerValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '800',
    color: THEME.colors.accent.emerald,
    marginVertical: 2
  },
  payoutBannerSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted
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
  saveBtn: {
    marginTop: THEME.spacing.xs
  }
});
