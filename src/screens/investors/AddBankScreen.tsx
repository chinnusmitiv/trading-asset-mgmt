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
  Switch,
  TouchableOpacity
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { maskBankAccount } from '../../utils/masking';

export const AddBankScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { investorId } = route.params;

  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [isPrimary, setIsPrimary] = useState(true);
  const [loading, setLoading] = useState(false);

  const maskedPreview = maskBankAccount(accountNumber);

  const handleSave = async () => {
    if (!bankName.trim()) {
      Alert.alert('Validation Error', 'Bank name is required.');
      return;
    }
    if (!accountHolderName.trim()) {
      Alert.alert('Validation Error', 'Account holder name is required.');
      return;
    }
    if (!accountNumber.trim() || accountNumber.trim().length < 6) {
      Alert.alert('Validation Error', 'Please enter a valid bank account number.');
      return;
    }
    if (!ifscCode.trim()) {
      Alert.alert('Validation Error', 'IFSC Code is required.');
      return;
    }

    setLoading(true);
    try {
      const created = await repository.addBankDetails({
        investorId,
        bankName: bankName.trim(),
        accountHolderName: accountHolderName.trim(),
        accountNumberMasked: maskedPreview,
        ifscCode: ifscCode.trim().toUpperCase(),
        accountType,
        isPrimary
      });

      Alert.alert(
        'Bank Account Attached',
        `Successfully linked ${created.bankName} (${created.accountNumberMasked}).`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to attach bank details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Add Bank Details"
        subtitle={`Investor Account: ${investorId}`}
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Masked Preview Highlight Card */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>MASKED ACCOUNT PREVIEW</Text>
            <Text style={styles.previewNumber}>{maskedPreview}</Text>
            <Text style={styles.previewNote}>
              🔒 Plaintext account numbers are masked immediately to comply with financial privacy standards.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>BANK SETTLEMENT DETAILS</Text>

            <Input
              label="Bank Name *"
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
            />

            <Input
              label="Account Holder Name (As per Bank Records) *"
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder="e.g. Rajesh Kumar"
            />

            <Input
              label="Full Bank Account Number *"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              placeholder="e.g. 50100234564582"
            />

            <Input
              label="IFSC Code *"
              value={ifscCode}
              onChangeText={setIfscCode}
              autoCapitalize="characters"
              placeholder="e.g. HDFC0000123"
            />

            {/* Account Type Selector */}
            <Text style={styles.inputLabel}>Account Type</Text>
            <View style={styles.typeRow}>
              {(['Savings', 'Current'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeBtn,
                    accountType === type && styles.typeBtnActive
                  ]}
                  onPress={() => setAccountType(type)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      accountType === type && styles.typeBtnTextActive
                    ]}
                  >
                    {type} Account
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Primary Toggle */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextGroup}>
                <Text style={styles.switchLabel}>Primary Payout Destination</Text>
                <Text style={styles.switchDesc}>
                  Use this account by default for all profit & principal payouts.
                </Text>
              </View>
              <Switch
                value={isPrimary}
                onValueChange={setIsPrimary}
                trackColor={{ false: THEME.colors.background.border, true: THEME.colors.accent.indigo }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <Button
            title="Attach Bank Account"
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
  previewCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  previewTitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  previewNumber: {
    fontSize: THEME.typography.fontSize.xxl,
    fontWeight: '800',
    color: THEME.colors.accent.indigo,
    letterSpacing: 1,
    marginVertical: 4
  },
  previewNote: {
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: THEME.spacing.sm
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  typeBtnActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  typeBtnText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '700'
  },
  typeBtnTextActive: {
    color: '#FFF'
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider,
    marginTop: THEME.spacing.sm
  },
  switchTextGroup: {
    flex: 1,
    marginRight: THEME.spacing.md
  },
  switchLabel: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  switchDesc: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  saveBtn: {
    marginTop: THEME.spacing.xs
  }
});
