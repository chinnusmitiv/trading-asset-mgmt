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
import { Salary } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const SalaryDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { salaryId } = route.params;

  const [salary, setSalary] = useState<Salary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={`${salary.salaryMonth} Salary Slip`}
        subtitle={`Staff: ${salary.staffId} • ${salary.salaryId}`}
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
          <Text style={styles.cardTitle}>COMPENSATION BREAKDOWN</Text>

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
            <Text style={styles.detailValue}>{salary.paymentMethod}</Text>
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

        {/* Disburse Button */}
        {salary.paymentStatus === 'Approved' && user?.role === 'Admin' && (
          <View style={styles.actionsBox}>
            <Button
              title="Disburse Funds / Mark as Paid"
              onPress={() => setPayModalVisible(true)}
              variant="success"
            />
          </View>
        )}
      </ScrollView>

      <ConfirmationDialog
        visible={payModalVisible}
        title="Disburse Staff Salary"
        message="Are you sure you want to mark this salary slip as PAID and record the settlement?"
        amount={salary.netSalary}
        recipientOrEntity={`Staff ID: ${salary.staffId}`}
        confirmLabel="Confirm & Disburse"
        variant="success"
        onConfirm={handleDisburse}
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
  }
});
