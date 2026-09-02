import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { Expense } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const ExpenseDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { expenseId } = route.params;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);

  const loadExpense = useCallback(async () => {
    try {
      const data = await repository.getExpenseDetails(expenseId);
      setExpense(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load expense particulars');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, expenseId]);

  useEffect(() => {
    loadExpense();
  }, [loadExpense]);

  const handleApprove = async () => {
    try {
      await repository.updateExpenseStatus(expenseId, 'Approved', user?.userId);
      loadExpense();
      Alert.alert('Approved', `Expense ${expenseId} approved.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve expense');
    }
  };

  const handleMarkPaid = async () => {
    try {
      const ref = `TXN-EXP-${Date.now()}`;
      await repository.updateExpenseStatus(expenseId, 'Paid', user?.userId, ref);
      setPayModalVisible(false);
      loadExpense();
      Alert.alert('Paid', `Expense ${expenseId} marked as PAID.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to disburse expense');
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Loading expenditure record..." />;
  }

  if (!expense) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Expense Details" user={user} />
        <EmptyState icon="⚠️" title="Expense Not Found" message="Could not find the requested expense." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={expense.description}
        subtitle={`${expense.category} • ${expense.expenseId}`}
        user={user}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadExpense();
            }}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >
        {/* Amount Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerLabel}>EXPENSE AMOUNT</Text>
          <Text style={styles.bannerValue}>{formatCurrency(expense.amount)}</Text>
          <View style={styles.bannerSubRow}>
            <Text style={styles.bannerSub}>Date: {formatDate(expense.expenseDate)}</Text>
            <StatusBadge status={expense.status} size="sm" />
          </View>
        </View>

        {/* Particulars Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EXPENDITURE METADATA</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{expense.category.replace('_', ' ')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.detailValue}>{expense.description}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vendor / Payee:</Text>
            <Text style={styles.detailValue}>{expense.vendor || '—'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Rail:</Text>
            <Text style={styles.detailValue}>{expense.paymentMethod}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Receipt / Invoice:</Text>
            <Text style={[styles.detailValue, { color: expense.receiptUrl ? THEME.colors.accent.indigo : THEME.colors.text.muted }]}>
              {expense.receiptUrl ? 'Linked Drive Receipt' : 'No Receipt Attached'}
            </Text>
          </View>
          {expense.approvedBy ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Approved By:</Text>
              <Text style={styles.detailValue}>{expense.approvedBy} ({formatDate(expense.approvedAt || '')})</Text>
            </View>
          ) : null}
          {expense.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{expense.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        {expense.status !== 'Paid' && expense.status !== 'Cancelled' && (
          <View style={styles.actionsBox}>
            {expense.status === 'Pending' && (user?.role === 'Admin' || user?.role === 'Manager') && (
              <Button
                title="Approve Expenditure"
                onPress={handleApprove}
                variant="primary"
              />
            )}
            {expense.status === 'Approved' && (
              <Button
                title="Disburse / Mark as Paid"
                onPress={() => setPayModalVisible(true)}
                variant="success"
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        visible={payModalVisible}
        title="Disburse Expense Payout"
        message="Are you sure you want to mark this operational expense as PAID and settle from firm accounts?"
        amount={expense.amount}
        recipientOrEntity={expense.vendor || expense.description}
        confirmLabel="Confirm & Pay"
        variant="success"
        onConfirm={handleMarkPaid}
        onCancel={() => setPayModalVisible(false)}
      />
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
  bannerCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  bannerLabel: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.secondary,
    letterSpacing: 0.8
  },
  bannerValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '800',
    color: THEME.colors.accent.rose,
    marginVertical: 4
  },
  bannerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  bannerSub: {
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider
  },
  detailLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
  },
  detailValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  notesBox: {
    marginTop: THEME.spacing.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md
  },
  notesLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginBottom: 2
  },
  notesText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    lineHeight: 18
  },
  actionsBox: {
    gap: THEME.spacing.sm,
    marginTop: 4
  }
});
