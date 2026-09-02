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
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { ExpenseCategory, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/currency';

export const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();

  const [category, setCategory] = useState<ExpenseCategory>('Software');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(15000);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank_Transfer');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const categories: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Internet',
    'Telephone',
    'Travel',
    'Food',
    'Office_Supplies',
    'Software',
    'Equipment',
    'Maintenance',
    'Marketing',
    'Professional_Fees',
    'Other'
  ];

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Expense description is required.');
      return;
    }
    if (amount <= 0) {
      Alert.alert('Validation Error', 'Expense amount must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const requestId = 'REQ-EXP-' + Date.now();
      const created = await repository.createExpense(
        {
          expenseDate,
          category,
          description: description.trim(),
          amount,
          paymentMethod,
          vendor: vendor.trim() || undefined,
          receiptUrl: receiptUrl.trim() || undefined,
          status: user?.role === 'Admin' ? 'Approved' : 'Pending',
          approvedBy: user?.role === 'Admin' ? user.userId : undefined,
          approvedAt: user?.role === 'Admin' ? new Date().toISOString() : undefined,
          notes: notes.trim() || undefined,
          createdBy: user?.userId || 'USR-00001'
        },
        requestId
      );

      Alert.alert(
        'Expense Recorded',
        `Expense ${created.expenseId} of ${formatCurrency(created.amount)} logged as ${created.status}.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Log Operational Expense"
        subtitle="Corporate Expenditure Book"
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Highlight Amount Banner */}
          <View style={styles.amountBanner}>
            <Text style={styles.amountBannerTitle}>EXPENSE AMOUNT</Text>
            <Text style={styles.amountBannerValue}>{formatCurrency(amount)}</Text>
            <Text style={styles.amountBannerSubtitle}>Category: {category.replace('_', ' ')}</Text>
          </View>

          {/* Category Selector */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EXPENSE CATEGORY *</Text>
            <View style={styles.categoryGrid}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catPill,
                    category === cat && styles.catPillActive
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      category === cat && styles.catPillTextActive
                    ]}
                  >
                    {cat.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Particulars */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>EXPENDITURE PARTICULARS</Text>

            <CurrencyInput
              label="Amount (INR) *"
              value={amount}
              onChangeValue={setAmount}
              placeholder="15,000"
            />

            <Input
              label="Description / Purpose *"
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. AWS & Google Cloud infrastructure invoice"
            />

            <Input
              label="Vendor / Payee Entity"
              value={vendor}
              onChangeText={setVendor}
              placeholder="e.g. Amazon Web Services Inc"
            />

            <Input
              label="Expense Date (YYYY-MM-DD) *"
              value={expenseDate}
              onChangeText={setExpenseDate}
              placeholder="2026-09-02"
            />
          </View>

          {/* Payment Rail & Receipt */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PAYMENT RAIL & RECEIPT</Text>

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {(['Bank_Transfer', 'Credit_Card', 'UPI', 'Cheque', 'Cash'] as PaymentMethod[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodBtn,
                    paymentMethod === m && styles.methodBtnActive
                  ]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === m && styles.methodBtnTextActive
                    ]}
                  >
                    {m.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Receipt Cloud Link / Google Drive URL"
              value={receiptUrl}
              onChangeText={setReceiptUrl}
              placeholder="https://drive.google.com/file/d/receipt_123"
            />

            <Input
              label="Additional Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Approved in monthly operational review"
            />
          </View>

          <Button
            title="Log Expense"
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
  amountBanner: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  amountBannerTitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  amountBannerValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '800',
    color: THEME.colors.accent.rose,
    marginVertical: 4
  },
  amountBannerSubtitle: {
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  catPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  catPillText: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  catPillTextActive: {
    color: '#FFF',
    fontWeight: '700'
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
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  methodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
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
