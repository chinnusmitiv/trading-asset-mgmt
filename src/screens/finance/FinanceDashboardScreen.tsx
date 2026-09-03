import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { KpiCard } from '../../components/common/KpiCard';
import { FinancialCard } from '../../components/common/FinancialCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { useAuth } from '../../store/AuthContext';
import { Expense, Salary, DashboardSummary } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const FinanceDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [activeTab, setActiveTab] = useState<'Expenses' | 'Salaries'>('Expenses');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFinanceData = useCallback(async () => {
    try {
      const [sum, exp, sal] = await Promise.all([
        repository.getDashboardSummary('2026-09'),
        repository.getExpenses(),
        repository.getSalaries()
      ]);
      setSummary(sum);
      setExpenses(exp || []);
      setSalaries(sal || []);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository]);

  useFocusEffect(
    useCallback(() => {
      loadFinanceData();
    }, [loadFinanceData])
  );

  if (loading && !refreshing) {
    return <LoadingState message="Reconciling financial ledgers..." />;
  }

  // Category expense breakdown
  const categoryTotals: Record<string, number> = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Company Finance"
        subtitle="Operational Cash Flow & Disbursements"
        user={user}
        rightAction={
          user?.role === 'Admin' || user?.role === 'Manager' ? (
            <Button
              title="+ Log Expense"
              size="sm"
              onPress={() => navigation.navigate('AddExpense')}
            />
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
              loadFinanceData();
            }}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >
        {/* Quick Action Strip */}
        <View style={styles.actionStrip}>
          <Button
            title="+ Log Expense"
            variant="primary"
            size="sm"
            onPress={() => navigation.navigate('AddExpense')}
            style={{ flex: 1 }}
          />
          <Button
            title="+ Process Payroll"
            variant="secondary"
            size="sm"
            onPress={() => navigation.navigate('ProcessPayroll')}
            style={{ flex: 1 }}
          />
          <Button
            title="All Payroll"
            variant="outline"
            size="sm"
            onPress={() => navigation.navigate('PayrollList')}
            style={{ flex: 1 }}
          />
        </View>

        {/* Executive KPI Strip */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="Operating Expenses"
            value={summary?.finance.expensesMonth || 0}
            compact
            accentColor={THEME.colors.accent.rose}
            deltaText={`${expenses.length} Records`}
          />
          <KpiCard
            label="Staff Payroll"
            value={summary?.finance.salariesMonth || 0}
            compact
            accentColor={THEME.colors.accent.amber}
            deltaText={`${salaries.length} Slips`}
          />
        </View>

        {/* Company Net Profit P&L Statement */}
        <FinancialCard
          title="Executive Company Net Profit Statement"
          subtitle="Consolidated firm revenue less all cost obligations"
          rows={[
            { label: 'Gross Prop Trading P&L', value: summary?.trading.monthlyPnL || 0, color: THEME.colors.accent.emerald },
            { label: 'Investor Profit Paid', value: summary?.investors.profitPaidMonth || 0, isDeduction: true },
            { label: 'Operational & Software Expenses', value: summary?.finance.expensesMonth || 0, isDeduction: true },
            { label: 'Staff Salaries & Commissions', value: summary?.finance.salariesMonth || 0, isDeduction: true }
          ]}
          netTotal={{
            label: 'Net Firm Operating Profit',
            value: summary?.finance.netCompanyProfit || 0
          }}
        />

        {/* Category Expense Breakdown */}
        <View style={styles.categoryCard}>
          <Text style={styles.categoryTitle}>EXPENSE BREAKDOWN BY CATEGORY</Text>
          <View style={styles.catGrid}>
            {Object.entries(categoryTotals).map(([cat, total]) => (
              <View key={cat} style={styles.catItem}>
                <Text style={styles.catName}>{cat.replace('_', ' ')}</Text>
                <Text style={styles.catAmount}>{formatCurrency(total)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sub-Ledger Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Expenses' && styles.tabButtonActive]}
            onPress={() => setActiveTab('Expenses')}
          >
            <Text style={[styles.tabText, activeTab === 'Expenses' && styles.tabTextActive]}>
              Office Expenses ({expenses.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Salaries' && styles.tabButtonActive]}
            onPress={() => setActiveTab('Salaries')}
          >
            <Text style={[styles.tabText, activeTab === 'Salaries' && styles.tabTextActive]}>
              Payroll Slips ({salaries.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sub-Ledger Content */}
        {activeTab === 'Expenses' ? (
          <View style={styles.ledgerList}>
            {expenses.map(item => (
              <TouchableOpacity
                key={item.expenseId}
                style={styles.ledgerCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ExpenseDetails', { expenseId: item.expenseId })}
              >
                <View style={styles.ledgerHeader}>
                  <View style={styles.ledgerTitleGroup}>
                    <Text style={styles.ledgerTitle}>{item.description}</Text>
                    <Text style={styles.ledgerSub}>
                      {item.category} • {formatDate(item.expenseDate)} ({item.expenseId})
                    </Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                <View style={styles.ledgerFooter}>
                  <Text style={styles.vendorText}>Vendor: {item.vendor || '—'}</Text>
                  <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.ledgerList}>
            {salaries.map(item => (
              <TouchableOpacity
                key={item.salaryId}
                style={styles.ledgerCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SalaryDetails', { salaryId: item.salaryId })}
              >
                <View style={styles.ledgerHeader}>
                  <View style={styles.ledgerTitleGroup}>
                    <Text style={styles.ledgerTitle}>{item.salaryMonth} Salary Slip</Text>
                    <Text style={styles.ledgerSub}>
                      Staff: {item.staffId} • {formatDate(item.paymentDate)}
                    </Text>
                  </View>
                  <StatusBadge status={item.paymentStatus} size="sm" />
                </View>
                <View style={styles.ledgerFooter}>
                  <Text style={styles.vendorText}>Basic: {formatCurrency(item.basicSalary)}</Text>
                  <Text style={[styles.amountText, { color: THEME.colors.accent.emerald }]}>
                    {formatCurrency(item.netSalary)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  actionStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2
  },
  kpiRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm
  },
  categoryCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  categoryTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8,
    marginBottom: THEME.spacing.sm
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  catItem: {
    backgroundColor: THEME.colors.background.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    minWidth: 100
  },
  catName: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  catAmount: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginTop: 2
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.accent.indigo
  },
  tabText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700'
  },
  ledgerList: {
    gap: THEME.spacing.sm
  },
  ledgerCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  ledgerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm
  },
  ledgerTitleGroup: {
    flex: 1,
    marginRight: 8
  },
  ledgerTitle: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  ledgerSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  ledgerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: THEME.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider
  },
  vendorText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted
  },
  amountText: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '800',
    color: THEME.colors.text.primary
  }
});
