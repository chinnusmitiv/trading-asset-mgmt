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
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { StaffCommission } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

export const StaffCommissionsScreen: React.FC = () => {
  const { user, repository } = useAuth();
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const loadCommissions = useCallback(async () => {
    try {
      const filters = user?.role === 'Staff' ? { staffId: user.staffId } : undefined;
      const data = await repository.getCommissions(filters);
      setCommissions(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load commissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, user]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  const handleUpdateStatus = async (commissionId: string, newStatus: StaffCommission['status']) => {
    try {
      await repository.updateCommissionStatus(commissionId, newStatus);
      loadCommissions();
      Alert.alert('Status Updated', `Commission ${commissionId} transitioned to ${newStatus}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update commission');
    }
  };

  const filtered = statusFilter === 'All' ? commissions : commissions.filter(c => c.status === statusFilter);

  const totalCommissions = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);

  const renderCommissionCard = ({ item }: { item: StaffCommission }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>{item.commissionPeriod} Commission</Text>
          <Text style={styles.cardSub}>
            Staff: {item.staffId} {item.tradeId ? `• Trade: ${item.tradeId}` : ''}
          </Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsRow}>
        <View>
          <Text style={styles.metricLabel}>Base Profit P&L</Text>
          <Text style={styles.metricVal}>{formatCurrency(item.baseAmount)}</Text>
        </View>
        <View>
          <Text style={styles.metricLabel}>Applied Cut Rate</Text>
          <Text style={[styles.metricVal, { color: THEME.colors.accent.indigo }]}>
            {item.appliedPercentage}%
          </Text>
        </View>
        <View>
          <Text style={styles.metricLabel}>Payable Commission</Text>
          <Text style={[styles.metricVal, { color: THEME.colors.accent.emerald }]}>
            {formatCurrency(item.commissionAmount)}
          </Text>
        </View>
      </View>

      {/* Action Buttons for Authorized Operators */}
      {user?.role === 'Admin' || user?.role === 'Manager' ? (
        <View style={styles.actionRow}>
          {item.status === 'Calculated' && (
            <Button
              title="Approve Commission"
              size="sm"
              variant="primary"
              onPress={() => handleUpdateStatus(item.commissionId, 'Approved')}
            />
          )}
          {item.status === 'Approved' && (
            <Button
              title="Mark as Paid"
              size="sm"
              variant="success"
              onPress={() => handleUpdateStatus(item.commissionId, 'Paid')}
            />
          )}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Staff Commissions"
        subtitle={`Total Accruals: ${formatCurrency(totalCommissions)}`}
        user={user}
      />

      <View style={styles.container}>
        {/* Filter Pills */}
        <View style={styles.filterPills}>
          {['All', 'Calculated', 'Approved', 'Paid'].map(st => (
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
          <LoadingState message="Fetching commission records..." />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.commissionId}
            renderItem={renderCommissionCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadCommissions();
                }}
                tintColor={THEME.colors.accent.indigo}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="💰"
                title="No Commissions Found"
                message="No commissions match the selected criteria."
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
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md
  },
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginBottom: 2
  },
  metricVal: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: THEME.spacing.sm
  }
});
