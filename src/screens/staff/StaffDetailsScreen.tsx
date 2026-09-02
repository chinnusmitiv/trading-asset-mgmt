import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { KpiCard } from '../../components/common/KpiCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { Staff, Trade, StaffCommission } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const StaffDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { staffId } = route.params;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'trades' | 'commissions' | 'info'>('trades');

  const loadStaffData = useCallback(async () => {
    try {
      const data = await repository.getStaffDetails(staffId);
      setStaff(data.staff);
      setTrades(data.trades);
      setCommissions(data.commissions);
      setMetrics(data.metrics);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load staff details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, staffId]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  if (loading && !refreshing) {
    return <LoadingState message="Loading staff trading profile..." />;
  }

  if (!staff) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Staff Profile" user={user} />
        <EmptyState icon="⚠️" title="Staff Not Found" message="Could not locate the requested profile." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={staff.name}
        subtitle={`${staff.role} • ${staff.department} (${staff.staffId})`}
        user={user}
      />

      {/* Tabs */}
      <View style={styles.tabsHeader}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'trades', label: `Trades Journal (${trades.length})` },
            { key: 'commissions', label: `Commissions (${commissions.length})` },
            { key: 'info', label: 'Compensation & Profile' }
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabPill,
                activeTab === t.key && styles.tabPillActive
              ]}
              onPress={() => setActiveTab(t.key as any)}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === t.key && styles.tabPillTextActive
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStaffData();
            }}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >
        {/* Performance KPI Grid */}
        <View style={styles.kpiGrid}>
          <KpiCard
            label="Total Net P&L"
            value={metrics?.totalNetPnL || 0}
            compact
            accentColor={(metrics?.totalNetPnL || 0) >= 0 ? THEME.colors.accent.emerald : THEME.colors.accent.rose}
            deltaText={`${metrics?.totalTrades || 0} Total Trades`}
          />
          <KpiCard
            label="Win Rate"
            value={`${metrics?.winRate?.toFixed(1) || 0}%`}
            isCurrency={false}
            accentColor={THEME.colors.accent.cyan}
            deltaText={`${metrics?.winningTrades || 0} Winning Executions`}
            deltaType="positive"
          />
        </View>

        <View style={styles.kpiGrid}>
          <KpiCard
            label="Trader Earned Cut"
            value={metrics?.totalStaffShare || 0}
            compact
            accentColor={THEME.colors.accent.indigo}
            deltaText={`${staff.tradingPercentage}% Profit Policy`}
          />
          <KpiCard
            label="Company Retained"
            value={metrics?.totalCompanyShare || 0}
            compact
            accentColor={THEME.colors.accent.emerald}
            deltaText="Firm Book Balance"
          />
        </View>

        {/* Quick Action Button */}
        <View style={styles.actionsBox}>
          <Button
            title="+ Log New Trade for this Trader"
            onPress={() => navigation.navigate('AddTrade', { staffId: staff.staffId })}
            variant="primary"
          />
        </View>

        {/* TAB 1: TRADES JOURNAL */}
        {activeTab === 'trades' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>TRADE EXECUTION HISTORY</Text>
            {trades.length === 0 ? (
              <EmptyState
                icon="📈"
                title="No Trades Logged"
                message="No trading activity has been recorded for this staff member."
                actionLabel="+ Log First Trade"
                onAction={() => navigation.navigate('AddTrade', { staffId: staff.staffId })}
              />
            ) : (
              trades.map(trade => {
                const isProfit = trade.netPnL >= 0;
                return (
                  <TouchableOpacity
                    key={trade.tradeId}
                    style={styles.card}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('TradeDetails', { tradeId: trade.tradeId })}
                  >
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardTitle}>{trade.asset}</Text>
                        <Text style={styles.cardSub}>
                          {formatDate(trade.tradeDate)} • {trade.tradeType} ({trade.tradeId})
                        </Text>
                      </View>
                      <StatusBadge status={trade.status} size="sm" />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.tradeMetricsRow}>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Net P&L</Text>
                        <Text
                          style={[
                            styles.pnlValue,
                            { color: isProfit ? THEME.colors.accent.emerald : THEME.colors.accent.rose }
                          ]}
                        >
                          {formatCurrency(trade.netPnL)}
                        </Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Trader Cut ({trade.appliedPercentage}%)</Text>
                        <Text style={styles.metricValue}>{formatCurrency(trade.staffShare)}</Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Company Cut</Text>
                        <Text style={styles.metricValue}>{formatCurrency(trade.companyShare)}</Text>
                      </View>
                    </View>

                    <View style={styles.footerRow}>
                      <Text style={styles.footerNote}>Margin: {formatCurrency(trade.capitalUsed)} • ROI: {trade.roiPercentage.toFixed(1)}%</Text>
                      <Text style={styles.viewDetailsText}>View Details ›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: COMMISSIONS */}
        {activeTab === 'commissions' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>COMMISSION ACCRUAL LEDGER</Text>
            {commissions.length === 0 ? (
              <EmptyState
                icon="💰"
                title="No Commission Accruals"
                message="Settled trades with positive profit cuts will appear here."
              />
            ) : (
              commissions.map(c => (
                <View key={c.commissionId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>{c.commissionPeriod} Commission</Text>
                      <Text style={styles.cardSub}>
                        {c.tradeId ? `Trade: ${c.tradeId}` : 'Consolidated Payout'}
                      </Text>
                    </View>
                    <StatusBadge status={c.status} size="sm" />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.commissionRow}>
                    <Text style={styles.commLabel}>Base P&L Amount:</Text>
                    <Text style={styles.commValue}>{formatCurrency(c.baseAmount)}</Text>
                  </View>
                  <View style={styles.commissionRow}>
                    <Text style={styles.commLabel}>Applied Cut Rate:</Text>
                    <Text style={styles.commValue}>{c.appliedPercentage}%</Text>
                  </View>
                  <View style={[styles.commissionRow, styles.totalCommRow]}>
                    <Text style={styles.totalCommLabel}>Accrued Commission:</Text>
                    <Text style={styles.totalCommValue}>{formatCurrency(c.commissionAmount)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: INFO */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>COMPENSATION & PROFILE PARTICULARS</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Role & Designation:</Text>
                <Text style={styles.infoValue}>{staff.role}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department:</Text>
                <Text style={styles.infoValue}>{staff.department}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Joining Date:</Text>
                <Text style={styles.infoValue}>{formatDate(staff.joiningDate)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trader Profit Cut %:</Text>
                <Text style={[styles.infoValue, { color: THEME.colors.accent.indigo }]}>
                  {staff.tradingPercentage}%
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Monthly Base Salary:</Text>
                <Text style={styles.infoValue}>
                  {user?.role === 'Admin' ? formatCurrency(staff.basicSalary) : '🔒 Restricted (Admin Only)'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{staff.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{staff.email}</Text>
              </View>
            </View>
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
  tabsHeader: {
    backgroundColor: THEME.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.border,
    paddingVertical: 8
  },
  tabsScroll: {
    paddingHorizontal: THEME.spacing.md,
    gap: 8
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  tabPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  tabPillText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '700'
  },
  tabPillTextActive: {
    color: '#FFF'
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.sm
  },
  actionsBox: {
    marginVertical: 4
  },
  tabContent: {
    gap: THEME.spacing.sm
  },
  sectionHeader: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8,
    marginLeft: 4,
    marginBottom: 4
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
  tradeMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md
  },
  metricCol: {
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginBottom: 2
  },
  pnlValue: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '800'
  },
  metricValue: {
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
  viewDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  commLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
  },
  commValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.text.primary
  },
  totalCommRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider
  },
  totalCommLabel: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  totalCommValue: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.accent.emerald
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider
  },
  infoLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
  },
  infoValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  }
});
