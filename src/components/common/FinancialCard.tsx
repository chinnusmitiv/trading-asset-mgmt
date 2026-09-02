import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';
import { formatCurrency } from '../../utils/currency';

interface FinancialRowItem {
  label: string;
  value: number;
  isTotal?: boolean;
  color?: string;
  isDeduction?: boolean;
}

interface FinancialCardProps {
  title: string;
  subtitle?: string;
  rows: FinancialRowItem[];
  netTotal: {
    label: string;
    value: number;
  };
}

export const FinancialCard: React.FC<FinancialCardProps> = ({
  title,
  subtitle,
  rows,
  netTotal
}) => {
  const isProfitPositive = netTotal.value >= 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rowsContainer}>
        {rows.map((row, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text
              style={[
                styles.rowValue,
                row.color ? { color: row.color } : null,
                row.isDeduction && { color: THEME.colors.accent.rose }
              ]}
            >
              {row.isDeduction ? `-${formatCurrency(row.value)}` : formatCurrency(row.value)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.netContainer}>
        <Text style={styles.netLabel}>{netTotal.label}</Text>
        <Text
          style={[
            styles.netValue,
            { color: isProfitPositive ? THEME.colors.accent.emerald : THEME.colors.accent.rose }
          ]}
        >
          {formatCurrency(netTotal.value)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    marginVertical: THEME.spacing.sm
  },
  header: {
    marginBottom: THEME.spacing.md
  },
  title: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  subtitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  rowsContainer: {
    gap: THEME.spacing.sm
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rowLabel: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary
  },
  rowValue: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '600',
    color: THEME.colors.text.primary
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.background.divider,
    marginVertical: THEME.spacing.md
  },
  netContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md
  },
  netLabel: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  netValue: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800'
  }
});
