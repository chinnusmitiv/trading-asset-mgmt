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
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { AuditLog } from '../../types';
import { formatDateTime } from '../../utils/date';

export const AuditLogScreen: React.FC = () => {
  const { user, repository } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [moduleFilter, setModuleFilter] = useState('All');

  const loadAuditLogs = useCallback(async () => {
    try {
      const data = await repository.getAuditLogs();
      setLogs(data);
    } catch (e) {
      // Handle error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const filteredLogs = moduleFilter === 'All' ? logs : logs.filter(l => l.module === moduleFilter);

  const renderAuditItem = ({ item }: { item: AuditLog }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={styles.actionBadge}>
          <Text style={styles.actionText}>{item.action}</Text>
        </View>
        <Text style={styles.timestamp}>{formatDateTime(item.timestamp)}</Text>
      </View>

      <View style={styles.logBody}>
        <Text style={styles.detailRow}>
          <Text style={styles.label}>Module: </Text>
          <Text style={styles.val}>{item.module}</Text>
          <Text style={styles.label}> • Actor: </Text>
          <Text style={styles.val}>{item.userId}</Text>
        </Text>

        {item.recordId ? (
          <Text style={styles.detailRow}>
            <Text style={styles.label}>Target ID: </Text>
            <Text style={styles.val}>{item.recordId}</Text>
          </Text>
        ) : null}

        {item.reason ? (
          <Text style={styles.reasonText}>Reason / Note: {item.reason}</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Audit Trail"
        subtitle="Immutable Security & Mutation Ledger"
        user={user}
      />

      <View style={styles.container}>
        {/* Module Filter Pills */}
        <View style={styles.filterPills}>
          {['All', 'Trading', 'Investors', 'Finance', 'Staff', 'Auth'].map(mod => (
            <TouchableOpacity
              key={mod}
              style={[
                styles.pill,
                moduleFilter === mod && styles.pillActive
              ]}
              onPress={() => setModuleFilter(mod)}
            >
              <Text
                style={[
                  styles.pillText,
                  moduleFilter === mod && styles.pillTextActive
                ]}
              >
                {mod}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !refreshing ? (
          <LoadingState message="Loading immutable audit trail..." />
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={item => item.auditId}
            renderItem={renderAuditItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadAuditLogs();
                }}
                tintColor={THEME.colors.accent.indigo}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="🛡️"
                title="No Audit Records"
                message="No audit entries match the selected module."
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
  logCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs
  },
  actionBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  actionText: {
    color: THEME.colors.accent.indigo,
    fontSize: 11,
    fontWeight: '800'
  },
  timestamp: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  logBody: {
    gap: 2,
    marginTop: 4
  },
  detailRow: {
    fontSize: THEME.typography.fontSize.xs
  },
  label: {
    color: THEME.colors.text.muted
  },
  val: {
    color: THEME.colors.text.primary,
    fontWeight: '600'
  },
  reasonText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontStyle: 'italic',
    marginTop: 4
  }
});
