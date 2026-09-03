import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { Investor } from '../../types';
import { formatDate } from '../../utils/date';
import { maskPhoneNumber } from '../../utils/masking';

export const InvestorsListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInvestors = useCallback(async () => {
    try {
      const data = await repository.getInvestors();
      setInvestors(data || []);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository]);

  // Immediately load on mount and every time user focuses on this tab
  useFocusEffect(
    useCallback(() => {
      loadInvestors();
    }, [loadInvestors])
  );

  // Synchronous and immediate filtering via useMemo
  const filteredInvestors = useMemo(() => {
    let result = [...investors];
    if (statusFilter !== 'All') {
      result = result.filter(i => i.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.investorId.toLowerCase().includes(q) ||
          i.phone.toLowerCase().includes(q)
      );
    }
    return result;
  }, [investors, statusFilter, searchQuery]);

  const renderInvestorCard = ({ item }: { item: Investor }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => {
        navigation.navigate('InvestorDetails', { investorId: item.investorId });
      }}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.investorName}>{item.name}</Text>
          <Text style={styles.investorId}>{item.investorId}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>
            {user?.role === 'Admin' ? item.phone : maskPhoneNumber(item.phone)}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Joined:</Text>
          <Text style={styles.infoValue}>{formatDate(item.joiningDate)}</Text>
        </View>
        {item.notes ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{item.notes}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.viewPortfolioText}>View 5-Tab Portfolio ›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Investor Directory"
        subtitle={`${investors.length} Registered Portfolios`}
        user={user}
        rightAction={
          user?.role === 'Admin' || user?.role === 'Manager' ? (
            <Button
              title="+ Add Investor"
              size="sm"
              onPress={() => navigation.navigate('AddInvestor')}
            />
          ) : undefined
        }
      />

      <View style={styles.container}>
        <SearchBar
          value={searchQuery}
          onSearch={setSearchQuery}
          placeholder="Search by name, ID, or phone..."
        />

        {/* Filter Pills */}
        <View style={styles.filterPills}>
          {['All', 'Active', 'Inactive', 'Suspended'].map(st => (
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
          <LoadingState message="Loading investor portfolios..." />
        ) : (
          <FlatList
            data={filteredInvestors}
            keyExtractor={item => item.investorId}
            renderItem={renderInvestorCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadInvestors();
                }}
                tintColor={THEME.colors.accent.indigo}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="👥"
                title="No Investors Found"
                message={
                  searchQuery
                    ? `No investors match "${searchQuery}".`
                    : 'No investors onboarded yet.'
                }
                actionLabel={user?.role !== 'Staff' ? '+ Onboard Investor' : undefined}
                onAction={() => navigation.navigate('AddInvestor')}
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
  investorName: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  investorId: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.background.divider,
    marginVertical: THEME.spacing.sm
  },
  cardBody: {
    gap: 4
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  infoLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted
  },
  infoValue: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '500'
  },
  cardFooter: {
    marginTop: THEME.spacing.sm,
    paddingTop: THEME.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider,
    alignItems: 'flex-end'
  },
  viewPortfolioText: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  }
});
