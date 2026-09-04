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
  Platform
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
import { Salary, SalaryStatus, PaymentMethod } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { calculateNetSalary } from '../../utils/calculations';

export const SalaryDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { salaryId } = route.params;

  const [salary, setSalary] = useState<Salary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit Salary Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    basicSalary: 0,
    allowance: 0,
    bonus: 0,
    commission: 0,
    deduction: 0,
    advance: 0,
    paymentMethod: 'Bank_Transfer' as PaymentMethod,
    paymentStatus: 'Approved' as SalaryStatus,
    paymentReference: '',
    notes: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  const loadSalary = useCallback(async () => {
    try {
      const data = await repository.getSalaryDetails(salaryId);
      setSalary(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load salary slip');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, salaryId]);

  useEffect(() => {
    loadSalary();
  }, [loadSalary]);

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!salary) return;
    setEditForm({
      basicSalary: salary.basicSalary || 0,
      allowance: salary.allowance || 0,
      bonus: salary.bonus || 0,
      commission: salary.commission || 0,
      deduction: salary.deduction || 0,
      advance: salary.advance || 0,
      paymentMethod: salary.paymentMethod || 'Bank_Transfer',
      paymentStatus: salary.paymentStatus || 'Approved',
      paymentReference: salary.paymentReference || '',
      notes: salary.notes || ''
    });
    setEditModalVisible(true);
  };

  // Save Edit Changes
  const handleSaveEdit = async () => {
    if (editForm.basicSalary < 0) {
      Alert.alert('Validation Error', 'Basic salary cannot be negative');
      return;
    }

    setEditLoading(true);
    try {
      await repository.updateSalary(salaryId, {
        basicSalary: editForm.basicSalary,
        allowance: editForm.allowance,
        bonus: editForm.bonus,
        commission: editForm.commission,
        deduction: editForm.deduction,
        advance: editForm.advance,
        paymentMethod: editForm.paymentMethod,
        paymentStatus: editForm.paymentStatus,
        paymentReference: editForm.paymentReference.trim() || undefined,
        notes: editForm.notes.trim() || undefined
      });
      setEditModalVisible(false);
      loadSalary();
      Alert.alert('Salary Slip Updated', `Salary slip ${salaryId} updated successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update salary slip');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete Salary
  const handleDeleteSalary = async () => {
    setDeleteLoading(true);
    try {
      await repository.deleteSalary(salaryId);
      setDeleteModalVisible(false);
      Alert.alert(
        'Salary Slip Deleted',
        `Salary slip ${salaryId} has been deleted. Associated commissions for this period have been restored to unpaid status.`
      );
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to delete salary slip');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDisburse = async () => {
    try {
      const ref = `SAL-NEFT-${Date.now()}`;
      await repository.updateSalaryStatus(salaryId, 'Paid', user?.userId, ref);
      setPayModalVisible(false);
      loadSalary();
      Alert.alert('Disbursed', `Salary slip ${salaryId} marked as PAID.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to disburse salary');
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Loading salary voucher..." />;
  }

  if (!salary) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Salary Voucher" user={user} />
        <EmptyState icon="⚠️" title="Salary Voucher Not Found" message="Could not locate the requested payroll voucher." />
      </SafeAreaView>
    );
  }

  const liveNetSalary = calculateNetSalary(
    editForm.basicSalary,
    editForm.allowance,
    editForm.bonus,
    editForm.commission,
    editForm.deduction,
    editForm.advance
  );

  const canEditOrDelete = user?.role === 'Admin' || user?.role === 'Manager';

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`${salary.salaryMonth} Salary Slip`}
        subtitle={`Staff: ${salary.staffId} • ${salary.salaryId}`}
        user={user}
        rightAction={
          canEditOrDelete ? (
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
              loadSalary();
            }}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >
        {/* Net Payout Banner */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerLabel}>NET SALARY PAYOUT</Text>
          <Text style={styles.bannerValue}>{formatCurrency(salary.netSalary)}</Text>
          <View style={styles.bannerSubRow}>
            <Text style={styles.bannerSub}>Period: {salary.salaryMonth}</Text>
            <StatusBadge status={salary.paymentStatus} size="sm" />
          </View>
        </View>

        {/* Voucher Breakdown Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>COMPENSATION BREAKDOWN</Text>
            {canEditOrDelete && (
              <TouchableOpacity
                style={styles.inlineEditBtn}
                onPress={handleOpenEdit}
              >
                <Text style={styles.inlineEditBtnText}>✏️ Edit Slip</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Basic Salary:</Text>
            <Text style={styles.detailValue}>{formatCurrency(salary.basicSalary)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trading Commissions:</Text>
            <Text style={[styles.detailValue, { color: THEME.colors.accent.indigo }]}>
              + {formatCurrency(salary.commission || 0)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Allowances / Per Diem:</Text>
            <Text style={styles.detailValue}>+ {formatCurrency(salary.allowance || 0)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Performance Bonus:</Text>
            <Text style={[styles.detailValue, { color: THEME.colors.accent.emerald }]}>
              + {formatCurrency(salary.bonus || 0)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Standard Deductions:</Text>
            <Text style={[styles.detailValue, { color: THEME.colors.accent.rose }]}>
              - {formatCurrency(salary.deduction || 0)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Advance Recoveries:</Text>
            <Text style={[styles.detailValue, { color: THEME.colors.accent.rose }]}>
              - {formatCurrency(salary.advance || 0)}
            </Text>
          </View>

          <View style={styles.totalDivider} />

          <View style={styles.detailRow}>
            <Text style={styles.totalLabel}>Net Payable Amount:</Text>
            <Text style={styles.totalValue}>{formatCurrency(salary.netSalary)}</Text>
          </View>
        </View>

        {/* Disbursement Particulars */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SETTLEMENT DETAILS</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method:</Text>
            <Text style={styles.detailValue}>{salary.paymentMethod?.replace('_', ' ') || 'Bank Transfer'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Date:</Text>
            <Text style={styles.detailValue}>{formatDate(salary.paymentDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bank Reference / UTR:</Text>
            <Text style={styles.detailValue}>{salary.paymentReference || '—'}</Text>
          </View>
          {salary.approvedBy ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Approved By:</Text>
              <Text style={styles.detailValue}>{salary.approvedBy}</Text>
            </View>
          ) : null}
          {salary.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{salary.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Panel for Admin & Desk Manager */}
        {canEditOrDelete && (
          <View style={styles.actionsBox}>
            {salary.paymentStatus === 'Approved' && user?.role === 'Admin' && (
              <Button
                title="💳 Disburse Funds / Mark as Paid"
                onPress={() => setPayModalVisible(true)}
                variant="success"
              />
            )}

            {salary.paymentStatus === 'Paid' && (
              <View style={styles.paidNoticeBox}>
                <Text style={styles.paidNoticeText}>✓ Salary Disbursed & Settled to Staff Bank Account</Text>
              </View>
            )}

            <Button
              title="🗑️ Delete Salary Slip"
              onPress={() => setDeleteModalVisible(true)}
              variant="danger"
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </ScrollView>

      {/* EDIT SALARY SLIP MODAL */}
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
                <Text style={styles.editModalTitle}>Edit Salary Slip</Text>
                <Text style={styles.editModalSub}>
                  {salary.salaryMonth} • Staff: {salary.staffId}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              {/* Live Net Salary Preview */}
              <View style={styles.liveNetBox}>
                <Text style={styles.liveNetLabel}>CALCULATED NET SALARY</Text>
                <Text style={styles.liveNetValue}>{formatCurrency(liveNetSalary)}</Text>
              </View>

              <CurrencyInput
                label="Basic Salary (₹) *"
                value={editForm.basicSalary}
                onChangeValue={val => setEditForm(prev => ({ ...prev, basicSalary: val }))}
              />

              <CurrencyInput
                label="Trading Commissions (₹)"
                value={editForm.commission}
                onChangeValue={val => setEditForm(prev => ({ ...prev, commission: val }))}
              />

              <CurrencyInput
                label="Allowances / Per Diem (₹)"
                value={editForm.allowance}
                onChangeValue={val => setEditForm(prev => ({ ...prev, allowance: val }))}
              />

              <CurrencyInput
                label="Performance Bonus (₹)"
                value={editForm.bonus}
                onChangeValue={val => setEditForm(prev => ({ ...prev, bonus: val }))}
              />

              <CurrencyInput
                label="Standard Deductions (₹)"
                value={editForm.deduction}
                onChangeValue={val => setEditForm(prev => ({ ...prev, deduction: val }))}
              />

              <CurrencyInput
                label="Advance Recovery (₹)"
                value={editForm.advance}
                onChangeValue={val => setEditForm(prev => ({ ...prev, advance: val }))}
              />

              <Text style={styles.inputLabel}>Disbursement Rail</Text>
              <View style={styles.pillsRow}>
                {(['Bank_Transfer', 'UPI', 'Cheque', 'Cash'] as PaymentMethod[]).map(rail => (
                  <TouchableOpacity
                    key={rail}
                    style={[
                      styles.pill,
                      editForm.paymentMethod === rail && styles.pillActive
                    ]}
                    onPress={() => setEditForm(prev => ({ ...prev, paymentMethod: rail }))}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        editForm.paymentMethod === rail && styles.pillTextActive
                      ]}
                    >
                      {rail.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Payment Status</Text>
              <View style={styles.pillsRow}>
                {(['Draft', 'Pending', 'Approved', 'Paid', 'Cancelled'] as SalaryStatus[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.pill,
                      editForm.paymentStatus === st && styles.pillActive
                    ]}
                    onPress={() => setEditForm(prev => ({ ...prev, paymentStatus: st }))}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        editForm.paymentStatus === st && styles.pillTextActive
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Payment Reference / UTR"
                value={editForm.paymentReference}
                onChangeText={text => setEditForm(prev => ({ ...prev, paymentReference: text }))}
                placeholder="UTR ref or transaction memo"
              />

              <Input
                label="Notes / Comments"
                value={editForm.notes}
                onChangeText={text => setEditForm(prev => ({ ...prev, notes: text }))}
                placeholder="Special allowances, adjustments, or remarks"
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
        title="Disburse Staff Salary"
        message="Are you sure you want to mark this salary slip as PAID and record the settlement in firm accounts?"
        amount={salary.netSalary}
        recipientOrEntity={`Staff ID: ${salary.staffId}`}
        confirmLabel="Confirm & Disburse"
        variant="success"
        onConfirm={handleDisburse}
        onCancel={() => setPayModalVisible(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteModalVisible}
        title="Delete Salary Slip"
        message="Are you sure you want to permanently delete this salary slip? Any trading commissions included in this slip will be automatically restored to unpaid status for future processing."
        amount={salary.netSalary}
        recipientOrEntity={`Staff ID: ${salary.staffId}`}
        confirmLabel={deleteLoading ? "Deleting..." : "Delete Slip"}
        variant="danger"
        onConfirm={handleDeleteSalary}
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
    color: THEME.colors.accent.emerald,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8
  },
  inlineEditBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  inlineEditBtnText: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6
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
  totalDivider: {
    height: 1,
    backgroundColor: THEME.colors.background.divider,
    marginVertical: THEME.spacing.sm
  },
  totalLabel: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  totalValue: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.accent.emerald
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
    marginTop: 4
  },
  paidNoticeBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  paidNoticeText: {
    color: THEME.colors.accent.emerald,
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end'
  },
  editModalContainer: {
    backgroundColor: THEME.colors.background.card,
    borderTopLeftRadius: THEME.borderRadius.xl,
    borderTopRightRadius: THEME.borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderColor: THEME.colors.background.border
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider
  },
  editModalTitle: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  editModalSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  modalCloseIcon: {
    fontSize: 20,
    color: THEME.colors.text.muted,
    padding: 4
  },
  editModalScroll: {
    padding: THEME.spacing.md,
    gap: THEME.spacing.sm
  },
  liveNetBox: {
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.accent.emerald,
    marginBottom: THEME.spacing.xs
  },
  liveNetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.text.secondary,
    letterSpacing: 0.8
  },
  liveNetValue: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: '800',
    color: THEME.colors.accent.emerald,
    marginTop: 2
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.secondary,
    marginTop: 6,
    marginBottom: 4
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  pillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  pillText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  editModalActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.lg
  }
});

