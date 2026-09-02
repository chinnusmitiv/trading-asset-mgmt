import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle
} from 'react-native';
import { THEME } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  helperText,
  style,
  ...rest
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputError : null,
          rest.editable === false ? styles.disabledInput : null
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={THEME.colors.text.muted}
          {...rest}
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.spacing.sm
  },
  label: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginBottom: 6
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background.input,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: THEME.spacing.md
  },
  input: {
    flex: 1,
    color: THEME.colors.text.primary,
    fontSize: THEME.typography.fontSize.base,
    paddingVertical: 12
  },
  inputError: {
    borderColor: THEME.colors.accent.rose
  },
  disabledInput: {
    opacity: 0.6
  },
  leftIcon: {
    marginRight: THEME.spacing.sm
  },
  rightIcon: {
    marginLeft: THEME.spacing.sm
  },
  errorText: {
    color: THEME.colors.accent.rose,
    fontSize: THEME.typography.fontSize.xs,
    marginTop: 4
  },
  helperText: {
    color: THEME.colors.text.muted,
    fontSize: THEME.typography.fontSize.xs,
    marginTop: 4
  }
});
