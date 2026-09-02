import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { KpiCard } from '../../components/common/KpiCard';
import { FinancialCard } from '../../components/common/FinancialCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { useAuth } from '../../store/AuthContext';
import { Expense, Salary, DashboardSummary } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const FinanceDashboardScreen: React.FC = () => {
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
      setExpenses(exp);
      setSalaries(sal);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  if (loading && !refreshing) {
    return <LoadingState message="Reconciling financial ledgers..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Company Finance"
        subtitle="Operational Cash Flow & Disbursements"
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
              loadFinanceData();
            }}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >
        {/* KPI Strip */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="Total Expenses"
            value={summary?.finance.expensesMonth || 0}
            compact
            accentColor={THEME.colors.accent.rose}
            deltaText="Approved & Paid"
          />
          <KpiCard
            label="Total Salaries"
            value={summary?.finance.salariesMonth || 0}
            compact
            accentColor={THEME.colors.accent.amber}
            deltaText="Monthly Payroll"
          />
        </View>

        {/* Company P&L Statement */}
        <FinancialCard
          title="Consolidated Monthly P&L"
          subtitle="All revenue lines and expense obligations"
          rows={[
            { label: 'Gross Trading P&L', value: summary?.trading.monthlyPnL || 0, color: THEME.colors.accent.emerald },
            { label: 'Investor Profit Paid', value: summary?.investors.profitPaidMonth || 0, isDeduction: true },
            { label: 'Office & Tech Expenses', value: summary?.finance.expensesMonth || 0, isDeduction: true },
            { label: 'Staff Salaries', value: summary?.finance.salariesMonth || 0, isDeduction: true }
          ]}
          netTotal={{
            label: 'Net Company Profit',
            value: summary?.finance.netCompanyProfit || 0
          }}
        />

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
              <View key={item.expenseId} style={styles.ledgerCard}>
                <View style={styles.ledgerHeader}>
                  <View style={styles.ledgerTitleGroup}>
                    <Text style={styles.ledgerTitle}>{item.description}</Text>
                    <Text style={styles.ledgerSub}>
                      {item.category} • {formatDate(item.expenseDate)}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} size="sm" />
                </View>
                <View style={styles.ledgerFooter}>
                  <Text style={styles.vendorText}>Vendor: {item.vendor || '—'}</Text>
                  <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.ledgerList}>
            {salaries.map(item => (
              <View key={item.salaryId} style={styles.ledgerCard}>
                <View style={styles.ledgerHeader}>
                  <View style={styles.ledgerTitleGroup}>
                    <Text style={styles.ledgerTitle}>Payroll: {item.salaryMonth}</Text>
                    <Text style={styles.ledgerSub}>Staff ID: {item.staffId}</Text>
                  </View>
                  <StatusBadge status={item.paymentStatus} size="sm" />
                </View>
                <View style={styles.ledgerFooter}>
                  <Text style={styles.vendorText}>Ref: {item.paymentReference || 'Direct Bank'}</Text>
                  <Text style={[styles.amountText, { color: THEME.colors.accent.emerald }]}>
                    {formatCurrency(item.netSalary)}
                  </Text>
                </View>
              </View>
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
    paddingBottom: THEME.spacing.xxl
  },
  kpiRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginVertical: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
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
    alignItems: 'flex-start'
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
    marginTop: THEME.spacing.sm,
    paddingTop: THEME.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider
  },
  vendorText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted
  },
  amountText: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.text.primary
  }
});
