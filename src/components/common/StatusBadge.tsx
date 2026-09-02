import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusColor = (s: string) => {
    const lower = (s || '').toLowerCase();
    if (['active', 'paid', 'approved', 'settled', 'valid', 'success'].includes(lower)) {
      return { bg: 'rgba(16, 185, 129, 0.15)', text: THEME.colors.accent.emerald };
    }
    if (['pending', 'submitted', 'draft', 'reviewed', 'expiring', 'warning'].includes(lower)) {
      return { bg: 'rgba(245, 158, 11, 0.15)', text: THEME.colors.accent.amber };
    }
    if (['inactive', 'closed', 'matured', 'archived', 'neutral'].includes(lower)) {
      return { bg: 'rgba(148, 163, 184, 0.15)', text: THEME.colors.text.secondary };
    }
    if (['suspended', 'failed', 'cancelled', 'reversed', 'rejected', 'expired'].includes(lower)) {
      return { bg: 'rgba(244, 63, 94, 0.15)', text: THEME.colors.accent.rose };
    }
    return { bg: 'rgba(99, 102, 241, 0.15)', text: THEME.colors.accent.indigo };
  };

  const colors = getStatusColor(status);
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        isSm ? styles.badgeSm : styles.badgeMd
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <Text
        style={[
          styles.text,
          { color: colors.text },
          isSm ? styles.textSm : styles.textMd
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: THEME.borderRadius.full,
    alignSelf: 'flex-start'
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  text: {
    fontWeight: '700',
    textTransform: 'capitalize'
  },
  textSm: {
    fontSize: 10
  },
  textMd: {
    fontSize: 12
  }
});
