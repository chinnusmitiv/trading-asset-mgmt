import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { Salary } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const PayrollListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();

  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [payModal, setPayModal] = useState<{ visible: boolean; salary: Salary | null }>({
    visible: false,
    salary: null
  });

  const loadSalaries = useCallback(async () => {
    try {
      const filters = user?.role === 'Staff' ? { staffId: user.staffId } : undefined;
      const data = await repository.getSalaries(filters);
      setSalaries(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load payroll records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, user]);

  useEffect(() => {
    loadSalaries();
  }, [loadSalaries]);

  const handleDisburseSalary = async () => {
    if (!payModal.salary) return;
    const salary = payModal.salary;
    try {
      const ref = `SAL-NEFT-${Date.now()}`;
      await repository.updateSalaryStatus(salary.salaryId, 'Paid', user?.userId, ref);
      setPayModal({ visible: false, salary: null });
      loadSalaries();
      Alert.alert('Disbursed', `Salary ${salary.salaryId} marked as PAID.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to disburse salary');
    }
  };

  const filtered = statusFilter === 'All' ? salaries : salaries.filter(s => s.paymentStatus === statusFilter);

  const totalPayroll = salaries.reduce((sum, s) => sum + s.netSalary, 0);

  const renderSalaryCard = ({ item }: { item: Salary }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('SalaryDetails', { salaryId: item.salaryId })}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.salaryMonth} Salary Slip</Text>
          <Text style={styles.cardSub}>
            Staff: {item.staffId} • {formatDate(item.paymentDate)}
          </Text>
        </View>
        <StatusBadge status={item.paymentStatus} size="sm" />
      </View>

      <View style={styles.divider} />

      <View style={styles.breakdownRow}>
        <View style={styles.col}>
          <Text style={styles.label}>Basic Pay</Text>
          <Text style={styles.val}>{formatCurrency(item.basicSalary)}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Commissions</Text>
          <Text style={[styles.val, { color: THEME.colors.accent.indigo }]}>
            {formatCurrency(item.commission || 0)}
          </Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Net Disbursed</Text>
          <Text style={[styles.val, { color: THEME.colors.accent.emerald }]}>
            {formatCurrency(item.netSalary)}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerNote}>
          Rail: {item.paymentMethod} {item.paymentReference ? `(${item.paymentReference})` : ''}
        </Text>
        {item.paymentStatus === 'Approved' && user?.role === 'Admin' ? (
          <Button
            title="Disburse Salary"
            size="sm"
            variant="success"
            onPress={() => setPayModal({ visible: true, salary: item })}
          />
        ) : (
          <Text style={styles.viewSlipLink}>View Slip ›</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Staff Payroll Vouchers"
        subtitle={`Total Disbursed: ${formatCurrency(totalPayroll)}`}
        user={user}
        rightAction={
          user?.role === 'Admin' || user?.role === 'Manager' ? (
            <Button
              title="+ Process Payroll"
              size="sm"
              onPress={() => navigation.navigate('ProcessPayroll')}
            />
          ) : undefined
        }
      />

      <View style={styles.container}>
        {/* Status Filter */}
        <View style={styles.filterPills}>
          {['All', 'Approved', 'Paid', 'Pending'].map(st => (
            <TouchableOpacity
              key={st}
              style={[
                styles.pill,
                statusFilter === st && styles.pillActive
              ]}
              onPress={() => setStatusFilter(st)}
            >
              <Text
                style={[
                  styles.pillText,
                  statusFilter === st && styles.pillTextActive
                ]}
              >
                {st}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !refreshing ? (
          <LoadingState message="Loading payroll records..." />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.salaryId}
            renderItem={renderSalaryCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadSalaries();
                }}
                tintColor={THEME.colors.accent.indigo}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="💵"
                title="No Payroll Records"
                message="No salary disbursement records found for this period."
              />
            }
          />
        )}
      </View>

      <ConfirmationDialog
        visible={payModal.visible}
        title="Disburse Staff Salary"
        message="Are you sure you want to mark this salary slip as PAID and disburse funds to staff bank account?"
        amount={payModal.salary?.netSalary}
        recipientOrEntity={`Staff ID: ${payModal.salary?.staffId}`}
        confirmLabel="Confirm & Disburse"
        variant="success"
        onConfirm={handleDisburseSalary}
        onCancel={() => setPayModal({ visible: false, salary: null })}
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
    flex: 1,
    paddingHorizontal: THEME.spacing.md
  },
  filterPills: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginVertical: THEME.spacing.sm
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background.card,
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
    color: '#FFF',
    fontWeight: '700'
  },
  listContent: {
    paddingBottom: THEME.spacing.xxl,
    gap: THEME.spacing.sm
  },
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  cardSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.background.divider,
    marginVertical: THEME.spacing.sm
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md
  },
  col: {
    alignItems: 'center'
  },
  label: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginBottom: 2
  },
  val: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.sm
  },
  footerNote: {
    fontSize: 11,
    color: THEME.colors.text.muted
  },
  viewSlipLink: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  }
});
