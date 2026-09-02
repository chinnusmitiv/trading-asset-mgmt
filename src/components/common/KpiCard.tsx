import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../../constants/theme';
import { formatCompactCurrency, formatCurrency } from '../../utils/currency';

interface KpiCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  compact?: boolean;
  deltaText?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  accentColor?: string;
  onPress?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  isCurrency = true,
  compact = false,
  deltaText,
  deltaType = 'neutral',
  accentColor = THEME.colors.accent.cyan,
  onPress
}) => {
  const displayValue =
    typeof value === 'number'
      ? isCurrency
        ? compact
          ? formatCompactCurrency(value)
          : formatCurrency(value)
        : String(value)
      : value;

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      style={[styles.card, { borderLeftColor: accentColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: accentColor }]}>{displayValue}</Text>

        {deltaText ? (
          <View style={styles.deltaContainer}>
            <Text
              style={[
                styles.deltaText,
                deltaType === 'positive' && { color: THEME.colors.accent.emerald },
                deltaType === 'negative' && { color: THEME.colors.accent.rose },
                deltaType === 'neutral' && { color: THEME.colors.text.secondary }
              ]}
            >
              {deltaText}
            </Text>
          </View>
        ) : null}
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    borderLeftWidth: 4,
    minWidth: 140,
    flex: 1
  },
  content: {
    justifyContent: 'center'
  },
  label: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  value: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: '700',
    letterSpacing: -0.5
  },
  deltaContainer: {
    marginTop: 4
  },
  deltaText: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600'
  }
});
