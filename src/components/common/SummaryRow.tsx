import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';

interface SummaryRowProps {
  label: string;
  value: string | number | React.ReactNode;
  isBold?: boolean;
  color?: string;
  hasDivider?: boolean;
}

export const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  value,
  isBold = false,
  color,
  hasDivider = false
}) => {
  return (
    <View style={[styles.container, hasDivider ? styles.divider : null]}>
      <Text style={[styles.label, isBold ? styles.boldLabel : null]}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text
          style={[
            styles.value,
            isBold ? styles.boldValue : null,
            color ? { color } : null
          ]}
        >
          {value}
        </Text>
      ) : (
        <>{value}</>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider,
    paddingBottom: 10,
    marginBottom: 6
  },
  label: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary
  },
  boldLabel: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  value: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '600',
    color: THEME.colors.text.primary
  },
  boldValue: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800'
  }
});
