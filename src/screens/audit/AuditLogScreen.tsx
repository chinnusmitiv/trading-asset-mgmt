import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView
} from 'react-native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { Button } from '../../components/common/Button';
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
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

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

  const formatJsonPretty = (raw?: string) => {
    if (!raw) return 'None (Initial Creation)';
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return raw;
    }
  };

  const renderAuditItem = ({ item }: { item: AuditLog }) => (
    <TouchableOpacity
      style={styles.logCard}
      activeOpacity={0.7}
      onPress={() => setSelectedLog(item)}
    >
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
          <Text style={styles.reasonText}>Reason: {item.reason}</Text>
        ) : null}

        <View style={styles.inspectHintRow}>
          <Text style={styles.inspectHint}>🔍 Tap to inspect before/after diff</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Audit Trail"
        subtitle={`${logs.length} Immutable Log Entries`}
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

      {/* JSON / Field Diff Inspection Modal */}
      <Modal
        visible={!!selectedLog}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Audit Event Inspection</Text>
                <Text style={styles.modalSub}>
                  {selectedLog?.auditId} • {selectedLog ? formatDateTime(selectedLog.timestamp) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLog(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.metaBox}>
                <Text style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Action: </Text>
                  <Text style={styles.metaVal}>{selectedLog?.action}</Text>
                </Text>
                <Text style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Module: </Text>
                  <Text style={styles.metaVal}>{selectedLog?.module}</Text>
                </Text>
                <Text style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Actor ID: </Text>
                  <Text style={styles.metaVal}>{selectedLog?.userId}</Text>
                </Text>
                <Text style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Target Record: </Text>
                  <Text style={styles.metaVal}>{selectedLog?.recordId || '—'}</Text>
                </Text>
                {selectedLog?.reason ? (
                  <Text style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Justification: </Text>
                    <Text style={styles.metaVal}>{selectedLog.reason}</Text>
                  </Text>
                ) : null}
              </View>

              {/* State Diff Comparison */}
              <Text style={styles.diffSectionTitle}>STATE MUTATION SNAPSHOT</Text>

              <Text style={styles.diffBoxTitle}>Prior State (Old Value):</Text>
              <View style={styles.codeBlock}>
                <Text style={styles.codeText}>{formatJsonPretty(selectedLog?.oldValue)}</Text>
              </View>

              <Text style={[styles.diffBoxTitle, { marginTop: 12 }]}>New State (New Value):</Text>
              <View style={[styles.codeBlock, styles.newCodeBlock]}>
                <Text style={[styles.codeText, { color: THEME.colors.accent.emerald }]}>
                  {formatJsonPretty(selectedLog?.newValue)}
                </Text>
              </View>
            </ScrollView>

            <Button
              title="Close Inspector"
              variant="secondary"
              onPress={() => setSelectedLog(null)}
              style={{ marginTop: THEME.spacing.sm }}
            />
          </View>
        </View>
      </Modal>
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
    backgroundColor: THEME.colors.background.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  actionText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.accent.indigo
  },
  timestamp: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  logBody: {
    marginTop: 4,
    gap: 4
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
    fontSize: 11,
    color: THEME.colors.accent.rose,
    fontStyle: 'italic',
    marginTop: 2
  },
  inspectHintRow: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider
  },
  inspectHint: {
    fontSize: 10,
    color: THEME.colors.accent.indigo,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.md
  },
  modalContainer: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
    paddingBottom: THEME.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider
  },
  modalTitle: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  modalSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  closeBtn: {
    padding: 4
  },
  closeBtnText: {
    fontSize: 18,
    color: THEME.colors.text.muted,
    fontWeight: '700'
  },
  modalScroll: {
    maxHeight: 450
  },
  metaBox: {
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    gap: 4
  },
  metaRow: {
    fontSize: THEME.typography.fontSize.xs
  },
  metaLabel: {
    color: THEME.colors.text.muted,
    fontWeight: '600'
  },
  metaVal: {
    color: THEME.colors.text.primary,
    fontWeight: '700'
  },
  diffSectionTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8,
    marginBottom: 8
  },
  diffBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text.secondary,
    marginBottom: 4
  },
  codeBlock: {
    backgroundColor: '#0F172A',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  newCodeBlock: {
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 10,
    color: THEME.colors.text.secondary
  }
});
