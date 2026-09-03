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
import { useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { KpiCard } from '../../components/common/KpiCard';
import { FinancialCard } from '../../components/common/FinancialCard';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { useAuth } from '../../store/AuthContext';
import { DashboardSummary } from '../../types';
import { formatCompactCurrency, formatCurrency } from '../../utils/currency';

export const DashboardScreen: React.FC = () => {
  const { user, repository, switchRole } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('This Month');

  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const data = await repository.getDashboardSummary('2026-09');
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load executive dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository]);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSummary();
  };

  if (loading && !refreshing) {
    return <LoadingState message="Loading management dashboard..." />;
  }

  if (error && !summary) {
    return <ErrorState message={error} onRetry={fetchSummary} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Executive Overview"
        subtitle="Asset Management Command Center"
        user={user}
        onProfilePress={() => {
          // Cycle through roles for rapid testing
          const nextRole = user?.role === 'Admin' ? 'Manager' : user?.role === 'Manager' ? 'Staff' : 'Admin';
          switchRole(nextRole);
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >
        {/* Period Filter Tabs */}
        <View style={styles.periodBar}>
          {['Today', 'This Week', 'This Month', 'This Year'].map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodTab,
                selectedPeriod === period && styles.periodTabActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Operational Alerts / Action Items */}
        {summary?.alerts && summary.alerts.length > 0 ? (
          <View style={styles.alertContainer}>
            {summary.alerts.map(alert => (
              <View key={alert.id} style={styles.alertCard}>
                <Text style={styles.alertIcon}>⚡</Text>
                <Text style={styles.alertText}>{alert.title}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Primary Executive Net Profit Banner */}
        <View style={styles.profitBanner}>
          <Text style={styles.profitBannerLabel}>NET COMPANY PROFIT ({selectedPeriod.toUpperCase()})</Text>
          <Text
            style={[
              styles.profitBannerValue,
              {
                color:
                  (summary?.finance.netCompanyProfit || 0) >= 0
                    ? THEME.colors.accent.emerald
                    : THEME.colors.accent.rose
              }
            ]}
          >
            {formatCurrency(summary?.finance.netCompanyProfit || 0)}
          </Text>
          <Text style={styles.profitBannerSubtext}>
            Trading P&L minus all investor payouts, operational costs & salaries
          </Text>
        </View>

        {/* Section 1: Capital Position */}
        <Text style={styles.sectionHeader}>CAPITAL ALLOCATION</Text>
        <View style={styles.kpiGrid}>
          <KpiCard
            label="Total Capital"
            value={summary?.capital.total || 0}
            compact
            accentColor={THEME.colors.accent.cyan}
            deltaText="100% Investor Principal"
          />
          <KpiCard
            label="Deployed in Trading"
            value={summary?.capital.deployed || 0}
            compact
            accentColor={THEME.colors.accent.indigo}
            deltaText={`${summary?.capital.utilizationPercentage.toFixed(0)}% Utilization`}
            deltaType="positive"
          />
          <KpiCard
            label="Liquid Cash"
            value={summary?.capital.available || 0}
            compact
            accentColor={THEME.colors.accent.emerald}
            deltaText="Available for Drawdown"
          />
        </View>

        {/* Section 2: Trading Performance */}
        <Text style={styles.sectionHeader}>TRADING OPERATIONS</Text>
        <View style={styles.kpiGrid}>
          <KpiCard
            label="Trading P&L"
            value={summary?.trading.monthlyPnL || 0}
            compact
            accentColor={
              (summary?.trading.monthlyPnL || 0) >= 0
                ? THEME.colors.accent.emerald
                : THEME.colors.accent.rose
            }
            deltaText={`${summary?.trading.totalTrades} Total Closed Trades`}
          />
          <KpiCard
            label="Win Rate"
            value={`${summary?.trading.winRate.toFixed(1)}%`}
            isCurrency={false}
            accentColor={THEME.colors.accent.cyan}
            deltaText={`${summary?.trading.winningTrades} Winning Trades`}
            deltaType="positive"
          />
        </View>

        {/* Section 3: Investor Outstandings */}
        <Text style={styles.sectionHeader}>INVESTORS & PAYOUTS</Text>
        <View style={styles.kpiGrid}>
          <KpiCard
            label="Active Investors"
            value={summary?.investors.activeCount || 0}
            isCurrency={false}
            accentColor={THEME.colors.accent.indigo}
            deltaText="All KYC Approved"
          />
          <KpiCard
            label="Monthly Profit Payouts"
            value={summary?.investors.profitPaidMonth || 0}
            compact
            accentColor={THEME.colors.accent.amber}
            deltaText={`${summary?.investors.pendingPaymentsCount || 0} Pending Disbursements`}
            deltaType={
              (summary?.investors.pendingPaymentsCount || 0) > 0 ? 'negative' : 'neutral'
            }
          />
        </View>

        {/* Section 4: Comprehensive Company Financial Ledger */}
        <Text style={styles.sectionHeader}>COMPANY FINANCIAL RECONCILIATION</Text>
        <FinancialCard
          title="Monthly Financial Invariant Balance"
          subtitle="Realized revenue minus operational deductions"
          rows={[
            {
              label: 'Trading Net P&L',
              value: summary?.trading.monthlyPnL || 0,
              color: THEME.colors.accent.emerald
            },
            {
              label: 'Investor Profit Distributions',
              value: summary?.investors.profitPaidMonth || 0,
              isDeduction: true
            },
            {
              label: 'Office & Operational Expenses',
              value: summary?.finance.expensesMonth || 0,
              isDeduction: true
            },
            {
              label: 'Staff Salaries & Payroll',
              value: summary?.finance.salariesMonth || 0,
              isDeduction: true
            }
          ]}
          netTotal={{
            label: 'Net Retained Company Profit',
            value: summary?.finance.netCompanyProfit || 0
          }}
        />
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
  periodBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm
  },
  periodTabActive: {
    backgroundColor: THEME.colors.accent.indigo
  },
  periodText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  periodTextActive: {
    color: '#FFF',
    fontWeight: '700'
  },
  alertContainer: {
    marginBottom: THEME.spacing.md,
    gap: 8
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm
  },
  alertIcon: {
    marginRight: 8,
    fontSize: 14
  },
  alertText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.accent.amber,
    fontWeight: '600',
    flex: 1
  },
  profitBanner: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center',
    marginBottom: THEME.spacing.lg
  },
  profitBannerLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  profitBannerValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '800',
    letterSpacing: -1,
    marginVertical: 4
  },
  profitBannerSubtext: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    textAlign: 'center'
  },
  sectionHeader: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 1,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    marginLeft: 4
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm
  }
});
