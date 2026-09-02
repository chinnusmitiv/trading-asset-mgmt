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
import { useNavigation } from '@react-navigation/native';
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
  const [filteredInvestors, setFilteredInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const loadInvestors = useCallback(async () => {
    try {
      const data = await repository.getInvestors();
      setInvestors(data);
      applyFilters(data, statusFilter, searchQuery);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, statusFilter, searchQuery]);

  useEffect(() => {
    loadInvestors();
  }, [loadInvestors]);

  const applyFilters = (data: Investor[], status: string, query: string) => {
    let result = [...data];
    if (status !== 'All') {
      result = result.filter(i => i.status === status);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.investorId.toLowerCase().includes(q) ||
          i.phone.includes(q)
      );
    }
    setFilteredInvestors(result);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(investors, statusFilter, text);
  };

  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    applyFilters(investors, status, searchQuery);
  };

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
          <Text style={styles.infoLabel}>Onboarding Date:</Text>
          <Text style={styles.infoValue}>{formatDate(item.joiningDate)}</Text>
        </View>
        {item.notes ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category:</Text>
            <Text style={styles.infoValue}>{item.notes}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Investors"
        subtitle={`${investors.length} Total Registered Portfolios`}
        user={user}
        rightAction={
          <Button
            title="+ Onboard"
            size="sm"
            onPress={() => navigation.navigate('AddInvestor')}
          />
        }
      />

      <View style={styles.container}>
        <SearchBar
          placeholder="Search by investor name, ID, phone..."
          onSearch={handleSearch}
        />

        <View style={styles.filterPills}>
          {['All', 'Active', 'Inactive', 'Suspended'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.pill,
                statusFilter === status && styles.pillActive
              ]}
              onPress={() => handleStatusChange(status)}
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
          <LoadingState message="Fetching investor ledger..." />
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
                message="No investor profiles match your search criteria."
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
    color: THEME.colors.text.muted,
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
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  infoLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
  },
  infoValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.text.primary
  }
});
