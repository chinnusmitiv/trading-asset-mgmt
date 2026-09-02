import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading operational data...'
}) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={THEME.colors.accent.indigo} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.xxl,
    backgroundColor: THEME.colors.background.primary
  },
  message: {
    marginTop: THEME.spacing.md,
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary
  }
});
