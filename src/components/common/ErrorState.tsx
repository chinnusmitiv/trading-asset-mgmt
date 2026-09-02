import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Operational Error',
  message,
  onRetry
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          title="Retry Operation"
          onPress={onRetry}
          variant="primary"
          size="md"
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
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    margin: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)'
  },
  icon: {
    fontSize: 40,
    marginBottom: THEME.spacing.sm
  },
  title: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.accent.rose,
    marginBottom: 4
  },
  message: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20
  },
  button: {
    marginTop: THEME.spacing.md
  }
});
