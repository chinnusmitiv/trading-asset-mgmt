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
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { Staff } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { hasPermission } from '../../services/auth/authService';

export const StaffListScreen: React.FC = () => {
  const { user, repository } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const data = await repository.getStaffList();
      setStaffList(data);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const canViewAll = hasPermission(user, 'VIEW_ALL_STAFF');

  const visibleStaff = canViewAll
    ? staffList
    : staffList.filter(s => s.staffId === user?.staffId);

  const renderStaffCard = ({ item }: { item: Staff }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.roleDept}>
            {item.role} • {item.department} ({item.staffId})
          </Text>
        </View>
        <StatusBadge status={item.status} size="sm" />
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Trader Cut</Text>
          <Text style={styles.detailValue}>{item.tradingPercentage}%</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Base Pay</Text>
          <Text style={styles.detailValue}>
            {user?.role === 'Admin' ? formatCurrency(item.basicSalary) : '🔒 Confidential'}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Joined Date</Text>
          <Text style={styles.detailValue}>{formatDate(item.joiningDate)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Staff & Traders"
        subtitle={`${visibleStaff.length} Active Team Members`}
        user={user}
      />

      <View style={styles.container}>
        {loading && !refreshing ? (
          <LoadingState message="Loading staff directory..." />
        ) : (
          <FlatList
            data={visibleStaff}
            keyExtractor={item => item.staffId}
            renderItem={renderStaffCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadStaff();
                }}
                tintColor={THEME.colors.accent.indigo}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="👔"
                title="No Staff Found"
                message="No staff profiles available."
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
  listContent: {
    paddingVertical: THEME.spacing.md,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  name: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  roleDept: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.background.divider,
    marginVertical: THEME.spacing.sm
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  detailItem: {
    alignItems: 'flex-start'
  },
  detailLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginBottom: 2
  },
  detailValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  }
});
