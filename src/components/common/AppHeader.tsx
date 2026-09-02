import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../constants/theme';
import { User } from '../../types';
import { SyncStatusBanner } from './SyncStatusBanner';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  user?: User | null;
  onProfilePress?: () => void;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  user,
  onProfilePress,
  rightAction
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 16
  );

  return (
    <View style={[styles.wrapper, { paddingTop: topPadding }]}>
      <SyncStatusBanner />
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        <View style={styles.rightContainer}>
          {rightAction}
          {user ? (
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={onProfilePress}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user.role}</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    backgroundColor: THEME.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.border
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.background.card
  },
  textContainer: {
    flex: 1,
    marginRight: THEME.spacing.sm
  },
  title: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.xs
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.accent.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 11
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)'
  },
  roleBadgeText: {
    color: THEME.colors.accent.indigo,
    fontSize: 10,
    fontWeight: '700'
  }
});
