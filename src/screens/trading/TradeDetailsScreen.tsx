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
import { Trade } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const TradeDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { tradeId } = route.params;

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [settleModalVisible, setSettleModalVisible] = useState<boolean>(false);

  const loadTrade = useCallback(async () => {
    try {
      const data = await repository.getTradeDetails(tradeId);
      setTrade(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load trade particulars');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, tradeId]);

  useEffect(() => {
    loadTrade();
  }, [loadTrade]);

  const handleUpdateStatus = async (newStatus: Trade['status']) => {
    try {
      await repository.updateTradeStatus(tradeId, newStatus);
      loadTrade();
      Alert.alert('Status Updated', `Trade ${tradeId} status updated to ${newStatus}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update trade status');
    }
  };

  const handleSettleTrade = async () => {
    try {
      const requestId = 'REQ-SETTLE-' + Date.now();
      const res = await repository.settleTrade(tradeId, requestId);
      setSettleModalVisible(false);
      loadTrade();
      Alert.alert(
        'Trade Settled',
        `Trade ${tradeId} settled into firm financial ledger.${
          res.commission ? ` Commission ${res.commission.commissionId} created for trader.` : ''
        }`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to settle trade');
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Loading trade audit book..." />;
  }

  if (!trade) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Trade Details" user={user} />
        <EmptyState icon="⚠️" title="Trade Not Found" message="Could not find trading transaction record." />
      </SafeAreaView>
    );
  }

  const isProfit = trade.netPnL >= 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={trade.asset}
        subtitle={`${trade.tradeType} Execution • ${trade.tradeId}`}
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
              loadTrade();
            }}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >
        {/* Realized P&L Headline Card */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerLabel}>REALIZED NET P&L</Text>
          <Text
            style={[
              styles.bannerValue,
              { color: isProfit ? THEME.colors.accent.emerald : THEME.colors.accent.rose }
            ]}
          >
            {formatCurrency(trade.netPnL)}
          </Text>
          <View style={styles.bannerSubRow}>
            <Text style={styles.bannerSub}>Trader: {trade.staffId}</Text>
            <StatusBadge status={trade.status} size="sm" />
          </View>
        </View>

        {/* Financial Distribution Splits */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>FINANCIAL PROFIT SHARING BREAKDOWN</Text>

          <View style={styles.splitRow}>
            <View style={styles.splitCol}>
              <Text style={styles.splitLabel}>Applied Trader Policy</Text>
              <Text style={[styles.splitVal, { color: THEME.colors.accent.indigo }]}>
                {trade.appliedPercentage}% Cut
              </Text>
            </View>
            <View style={styles.splitCol}>
              <Text style={styles.splitLabel}>Trader Cut Earned</Text>
              <Text style={styles.splitVal}>{formatCurrency(trade.staffShare)}</Text>
            </View>
            <View style={styles.splitCol}>
              <Text style={styles.splitLabel}>Company Retained</Text>
              <Text style={[styles.splitVal, { color: THEME.colors.accent.emerald }]}>
                {formatCurrency(trade.companyShare)}
              </Text>
            </View>
          </View>
        </View>

        {/* Execution Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EXECUTION PARTICULARS</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Asset / Symbol:</Text>
            <Text style={styles.detailValue}>{trade.asset}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Strategy / Type:</Text>
            <Text style={styles.detailValue}>{trade.tradeType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trade Date:</Text>
            <Text style={styles.detailValue}>{formatDate(trade.tradeDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Capital Used / Margin:</Text>
            <Text style={styles.detailValue}>{formatCurrency(trade.capitalUsed)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Entry Price:</Text>
            <Text style={styles.detailValue}>{trade.entryPrice}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Exit Price:</Text>
            <Text style={styles.detailValue}>{trade.exitPrice}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text style={styles.detailValue}>{trade.quantity}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gross Profit:</Text>
            <Text style={[styles.detailValue, { color: THEME.colors.accent.emerald }]}>
              {formatCurrency(trade.grossProfit)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gross Loss:</Text>
            <Text style={[styles.detailValue, { color: THEME.colors.accent.rose }]}>
              {formatCurrency(trade.grossLoss)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Return on Margin (ROI):</Text>
            <Text style={[styles.detailValue, { color: THEME.colors.accent.cyan }]}>
              {trade.roiPercentage.toFixed(2)}%
            </Text>
          </View>
          {trade.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes & Strategy Rationale:</Text>
              <Text style={styles.notesText}>{trade.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Workflow Action Buttons */}
        {user?.role !== 'Staff' && trade.status !== 'Settled' && (
          <View style={styles.actionsContainer}>
            {trade.status === 'Submitted' && (
              <Button
                title="Mark Trade as Reviewed"
                onPress={() => handleUpdateStatus('Reviewed')}
                variant="secondary"
              />
            )}
            <Button
              title="Settle Trade into Financial Books"
              onPress={() => setSettleModalVisible(true)}
              variant="success"
            />
          </View>
        )}
      </ScrollView>

      {/* Confirmation Dialog for Settling Trade */}
      <ConfirmationDialog
        visible={settleModalVisible}
        title="Settle Trade Transaction"
        message="Settling this trade will lock it into the firm P&L and automatically generate trader commission accruals."
        amount={trade.netPnL}
        recipientOrEntity={`Trader: ${trade.staffId}`}
        confirmLabel="Confirm & Settle Trade"
        variant="success"
        onConfirm={handleSettleTrade}
        onCancel={() => setSettleModalVisible(false)}
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
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md
  },
  splitCol: {
    alignItems: 'center',
    flex: 1
  },
  splitLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginBottom: 4
  },
  splitVal: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '800',
    color: THEME.colors.text.primary
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
  actionsContainer: {
    gap: THEME.spacing.sm,
    marginTop: 4
  }
});
