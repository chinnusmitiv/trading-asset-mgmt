import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { THEME } from '../../constants/theme';
import { useSync } from '../../store/SyncContext';

export const SyncStatusBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, syncNow, toggleOnlineStatus } = useSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  if (isSyncing) {
    return (
      <View style={[styles.banner, styles.syncingBanner]}>
        <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.bannerText}>
          Syncing {pendingCount} offline transaction{pendingCount !== 1 ? 's' : ''}...
        </Text>
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={[styles.banner, styles.offlineBanner]}>
        <View style={styles.textGroup}>
          <Text style={styles.offlineIcon}>⚡</Text>
          <Text style={styles.bannerText}>
            Offline Mode • Showing Cached Data {pendingCount > 0 ? `(${pendingCount} queued)` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleOnlineStatus}>
          <Text style={styles.actionBtnText}>Go Online</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View style={[styles.banner, styles.pendingBanner]}>
        <Text style={styles.bannerText}>
          {pendingCount} offline change{pendingCount !== 1 ? 's' : ''} ready to sync
        </Text>
        <TouchableOpacity style={styles.actionBtn} onPress={syncNow}>
          <Text style={styles.actionBtnText}>Sync Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 8
  },
  offlineBanner: {
    backgroundColor: '#854D0E' // Amber 800
  },
  syncingBanner: {
    backgroundColor: '#1E40AF', // Blue 800
    justifyContent: 'center'
  },
  pendingBanner: {
    backgroundColor: '#065F46' // Emerald 800
  },
  textGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  offlineIcon: {
    fontSize: 12,
    marginRight: 6
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  actionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    marginLeft: 8
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800'
  }
});
