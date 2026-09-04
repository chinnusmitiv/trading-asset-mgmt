import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { Expense, ExpenseCategory, ExpenseStatus, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
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

export const ExpenseDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { expenseId } = route.params;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit Expense Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    category: 'Software' as ExpenseCategory,
    description: '',
    amount: 0,
    vendor: '',
    paymentMethod: 'Bank_Transfer' as PaymentMethod,
    status: 'Pending' as ExpenseStatus,
    notes: ''
  });
  const [editLoading, setEditLoading] = useState(false);

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

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!expense) return;
    setEditForm({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      vendor: expense.vendor || '',
      paymentMethod: expense.paymentMethod,
      status: expense.status,
      notes: expense.notes || ''
    });
    setEditModalVisible(true);
  };

  // Save Edit Changes
  const handleSaveEdit = async () => {
    if (!editForm.description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return;
    }
    if (editForm.amount <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than zero');
      return;
    }

    setEditLoading(true);
    try {
      await repository.updateExpense(expenseId, {
        category: editForm.category,
        description: editForm.description.trim(),
        amount: editForm.amount,
        vendor: editForm.vendor.trim() || undefined,
        paymentMethod: editForm.paymentMethod,
        status: editForm.status,
        notes: editForm.notes.trim() || undefined
      });
      setEditModalVisible(false);
      loadExpense();
      Alert.alert('Expense Updated', `Expense ${expenseId} updated successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update expense');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async () => {
    setDeleteLoading(true);
    try {
      await repository.deleteExpense(expenseId);
      setDeleteModalVisible(false);
      Alert.alert('Expense Deleted', `Expense ${expenseId} has been deleted.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete expense');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Quick Action: Approve
  const handleApprove = async () => {
    try {
      await repository.updateExpenseStatus(expenseId, 'Approved', user?.userId);
      loadExpense();
      Alert.alert('Approved', `Expense ${expenseId} approved.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve expense');
    }
  };

  // Quick Action: Reject
  const handleReject = async () => {
    try {
      await repository.updateExpenseStatus(expenseId, 'Rejected', user?.userId);
      loadExpense();
      Alert.alert('Rejected', `Expense ${expenseId} has been marked as Rejected.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject expense');
    }
  };

  // Quick Action: Mark Paid
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

  const isPendingApproval =
    expense.status === 'Submitted' || expense.status === 'Pending' || expense.status === 'Draft';
  const isApproved = expense.status === 'Approved';
  const isPaid = expense.status === 'Paid';

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={expense.description}
        subtitle={`${expense.category.replace('_', ' ')} • ${expense.expenseId}`}
        user={user}
        rightAction={
          user?.role === 'Admin' || user?.role === 'Manager' ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Button
                title="✏️ Edit"
                size="sm"
                variant="outline"
                onPress={handleOpenEdit}
              />
              <Button
                title="🗑️"
                size="sm"
                variant="danger"
                onPress={() => setDeleteModalVisible(true)}
              />
            </View>
          ) : undefined
        }
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
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>EXPENDITURE PARTICULARS</Text>
            {(user?.role === 'Admin' || user?.role === 'Manager') && (
              <TouchableOpacity
                style={styles.inlineEditBtn}
                onPress={handleOpenEdit}
              >
                <Text style={styles.inlineEditBtnText}>✏️ Edit Details</Text>
              </TouchableOpacity>
            )}
          </View>

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
            <Text style={styles.detailValue}>{expense.paymentMethod.replace('_', ' ')}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <StatusBadge status={expense.status} size="sm" />
          </View>
          {expense.approvedBy ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Approved By:</Text>
              <Text style={styles.detailValue}>{expense.approvedBy} ({formatDate(expense.approvedAt || '')})</Text>
            </View>
          ) : null}
          {expense.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes / Reference:</Text>
              <Text style={styles.notesText}>{expense.notes}</Text>
            </View>
          ) : null}

          {expense.receiptUrl ? (
            <TouchableOpacity
              style={styles.receiptBtn}
              onPress={() => Linking.openURL(expense.receiptUrl!).catch(() => {})}
            >
              <Text style={styles.receiptBtnText}>🔗 View Linked Invoice / Receipt</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Action Buttons (For Admin & Desk Manager) */}
        {(user?.role === 'Admin' || user?.role === 'Manager') && (
          <View style={styles.actionsContainer}>
            {isPendingApproval && (
              <View style={styles.actionsRow}>
                <Button
                  title="✕ Reject"
                  onPress={handleReject}
                  variant="danger"
                  style={{ flex: 1 }}
                />
                <Button
                  title="✓ Approve Expenditure"
                  onPress={handleApprove}
                  variant="primary"
                  style={{ flex: 2 }}
                />
              </View>
            )}

            {(isApproved || isPendingApproval) && (
              <Button
                title="💳 Disburse / Mark as Paid"
                onPress={() => setPayModalVisible(true)}
                variant="success"
                style={{ marginTop: 8 }}
              />
            )}

            {isPaid && (
              <View style={styles.paidNoticeBox}>
                <Text style={styles.paidNoticeText}>✓ Expense Disbursed & Settled in Firm Ledger</Text>
              </View>
            )}

            <Button
              title="🗑️ Delete Expense Entry"
              onPress={() => setDeleteModalVisible(true)}
              variant="danger"
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </ScrollView>

      {/* EDIT EXPENSE MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.editModalTitle}>Edit Expense Voucher</Text>
                <Text style={styles.editModalSub}>{expense.expenseId}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              <CurrencyInput
                label="Amount (₹) *"
                value={editForm.amount}
                onChangeValue={val => setEditForm(prev => ({ ...prev, amount: val }))}
              />

              <Input
                label="Description *"
                value={editForm.description}
                onChangeText={text => setEditForm(prev => ({ ...prev, description: text }))}
                placeholder="e.g. Server hosting, Bloomberg Terminal"
              />

              <Input
                label="Vendor / Payee Name"
                value={editForm.vendor}
                onChangeText={text => setEditForm(prev => ({ ...prev, vendor: text }))}
                placeholder="e.g. AWS Cloud, WeWork"
              />

              <Text style={styles.inputLabel}>Expense Category</Text>
              <View style={styles.categoryPillsGrid}>
                {EXPENSE_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      editForm.category === cat && styles.categoryPillActive
                    ]}
                    onPress={() => setEditForm(prev => ({ ...prev, category: cat }))}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        editForm.category === cat && styles.categoryPillTextActive
                      ]}
                    >
                      {cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Payment Rail</Text>
              <View style={styles.statusPillsRow}>
                {(['Bank_Transfer', 'UPI', 'Credit_Card', 'Cash'] as PaymentMethod[]).map(rail => (
                  <TouchableOpacity
                    key={rail}
                    style={[
                      styles.statusPill,
                      editForm.paymentMethod === rail && styles.statusPillActive
                    ]}
                    onPress={() => setEditForm(prev => ({ ...prev, paymentMethod: rail }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        editForm.paymentMethod === rail && styles.statusPillTextActive
                      ]}
                    >
                      {rail.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Voucher Status</Text>
              <View style={styles.statusPillsRow}>
                {(['Submitted', 'Pending', 'Approved', 'Paid', 'Rejected'] as ExpenseStatus[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPill,
                      editForm.status === st && styles.statusPillActive
                    ]}
                    onPress={() => setEditForm(prev => ({ ...prev, status: st }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        editForm.status === st && styles.statusPillTextActive
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Notes / Transaction Ref"
                value={editForm.notes}
                onChangeText={text => setEditForm(prev => ({ ...prev, notes: text }))}
                placeholder="UTR ref, reason, receipt memo"
              />

              <View style={styles.editModalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Changes"
                  variant="primary"
                  loading={editLoading}
                  onPress={handleSaveEdit}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pay Confirmation Dialog */}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteModalVisible}
        title="Delete Expense Record"
        message="Are you sure you want to permanently delete this expense voucher? This action will remove the record and adjust the company net profit ledger."
        amount={expense.amount}
        recipientOrEntity={expense.vendor || expense.description}
        confirmLabel={deleteLoading ? "Deleting..." : "Delete Voucher"}
        variant="danger"
        onConfirm={handleDeleteExpense}
        onCancel={() => setDeleteModalVisible(false)}
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
    gap: THEME.spacing.md
  },
  bannerCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8
  },
  bannerValue: {
    fontSize: THEME.typography.fontSize.xxl,
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
    color: THEME.colors.text.secondary
  },
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    gap: 12
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8
  },
  inlineEditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  inlineEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider
  },
  detailLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
  },
  detailValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.text.primary,
    maxWidth: '60%',
    textAlign: 'right'
  },
  notesBox: {
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    marginTop: 4
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.text.muted,
    marginBottom: 2
  },
  notesText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    lineHeight: 18
  },
  receiptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.accent.indigo,
    alignItems: 'center',
    marginTop: 4
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  },
  actionsContainer: {
    marginTop: 8
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  paidNoticeBox: {
    paddingVertical: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.accent.emerald,
    alignItems: 'center'
  },
  paidNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.accent.emerald
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg
  },
  editModalContainer: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    padding: THEME.spacing.lg
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md
  },
  editModalTitle: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  editModalSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.accent.indigo,
    fontWeight: '700',
    marginTop: 2
  },
  modalCloseIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text.muted,
    padding: 4
  },
  editModalScroll: {
    paddingBottom: THEME.spacing.md,
    gap: THEME.spacing.sm
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginBottom: 6
  },
  categoryPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  categoryPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  categoryPillText: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  categoryPillTextActive: {
    color: '#FFF',
    fontWeight: '700'
  },
  statusPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  statusPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  statusPillText: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  statusPillTextActive: {
    color: '#FFF',
    fontWeight: '800'
  },
  editModalActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md
  }
});
