import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { KpiCard } from '../../components/common/KpiCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { Trade } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const TradingDashboardScreen: React.FC = () => {
  const { user, repository } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const loadTrades = useCallback(async () => {
    try {
      const filters = user?.role === 'Staff' ? { staffId: user.staffId } : undefined;
      const data = await repository.getTrades(filters);
      setTrades(data);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, user]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  const filteredTrades = statusFilter === 'All' ? trades : trades.filter(t => t.status === statusFilter);

  // Compute live aggregates
  const totalPnL = trades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalStaffShare = trades.reduce((acc, t) => acc + t.staffShare, 0);
  const totalCompanyShare = trades.reduce((acc, t) => acc + t.companyShare, 0);
  const winningTrades = trades.filter(t => t.netPnL > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  const renderTradeItem = ({ item }: { item: Trade }) => {
    const isProfit = item.netPnL >= 0;

    return (
      <View style={styles.tradeCard}>
        <View style={styles.tradeHeader}>
          <View>
            <Text style={styles.assetName}>{item.asset}</Text>
            <Text style={styles.tradeSub}>
              {formatDate(item.tradeDate)} • {item.tradeType}
            </Text>
          </View>
          <StatusBadge status={item.status} size="sm" />
        </View>

        <View style={styles.tradeMetricsRow}>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Net P&L</Text>
            <Text
              style={[
                styles.pnlValue,
                { color: isProfit ? THEME.colors.accent.emerald : THEME.colors.accent.rose }
              ]}
            >
              {formatCurrency(item.netPnL)}
            </Text>
          </View>

          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Trader Cut ({item.appliedPercentage}%)</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.staffShare)}</Text>
          </View>

          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Company Cut</Text>
            <Text style={styles.metricValue}>{formatCurrency(item.companyShare)}</Text>
          </View>
        </View>

        <View style={styles.tradeFooter}>
          <Text style={styles.tradeFooterText}>
            Margin: {formatCurrency(item.capitalUsed)} • ROI: {item.roiPercentage.toFixed(1)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Trading Operations"
        subtitle={user?.role === 'Staff' ? 'Your Personal Trading Book' : 'Firm Prop Trading Books'}
        user={user}
      />

      <View style={styles.container}>
        {/* KPI Strip */}
        <View style={styles.kpiRow}>
          <KpiCard
            label="Trading Net P&L"
            value={totalPnL}
            compact
            accentColor={totalPnL >= 0 ? THEME.colors.accent.emerald : THEME.colors.accent.rose}
            deltaText={`${trades.length} Executions`}
          />
          <KpiCard
            label="Win Rate"
            value={`${winRate.toFixed(0)}%`}
            isCurrency={false}
            accentColor={THEME.colors.accent.cyan}
            deltaText={`${winningTrades} Wins`}
            deltaType="positive"
          />
          <KpiCard
            label="Firm Retained"
            value={totalCompanyShare}
            compact
            accentColor={THEME.colors.accent.indigo}
            deltaText="Company Book"
          />
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPills}>
          {['All', 'Settled', 'Submitted', 'Reviewed'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.pill,
                statusFilter === status && styles.pillActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.pillText,
                  statusFilter === status && styles.pillTextActive
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !refreshing ? (
          <LoadingState message="Fetching trades journal..." />
        ) : (
          <FlatList
            data={filteredTrades}
            keyExtractor={item => item.tradeId}
            renderItem={renderTradeItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadTrades();
                }}
                tintColor={THEME.colors.accent.indigo}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="📊"
                title="No Trades Found"
                message="No trading logs found for this filter."
              />
            }
          />
        )}
      </View>
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
  kpiRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginVertical: THEME.spacing.md
  },
  filterPills: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm
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
  tradeCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  assetName: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  tradeSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  tradeMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: THEME.spacing.sm,
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
  tradeFooter: {
    marginTop: 2
  },
  tradeFooterText: {
    fontSize: 11,
    color: THEME.colors.text.muted
  }
});
