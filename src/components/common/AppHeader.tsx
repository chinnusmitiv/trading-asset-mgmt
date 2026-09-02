import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../../constants/theme';
import { User } from '../../types';

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
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.border
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: '700',
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
    gap: THEME.spacing.sm
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background.card,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.accent.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13
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
