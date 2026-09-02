import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📁',
  title,
  message,
  actionLabel,
  onAction
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.button}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xxl,
    marginVertical: THEME.spacing.xl
  },
  icon: {
    fontSize: 48,
    marginBottom: THEME.spacing.md
  },
  title: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginBottom: THEME.spacing.xs,
    textAlign: 'center'
  },
  message: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280
  },
  button: {
    marginTop: THEME.spacing.lg
  }
});
