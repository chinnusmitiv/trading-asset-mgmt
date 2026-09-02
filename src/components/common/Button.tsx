import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { THEME } from '../../constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon
}) => {
  const getBackgroundColor = () => {
    if (disabled) return THEME.colors.background.cardElevated;
    switch (variant) {
      case 'primary':
        return THEME.colors.accent.indigo;
      case 'secondary':
        return THEME.colors.background.cardElevated;
      case 'outline':
        return 'transparent';
      case 'danger':
        return THEME.colors.accent.rose;
      case 'success':
        return THEME.colors.accent.emerald;
      default:
        return THEME.colors.accent.indigo;
    }
  };

  const getTextColor = () => {
    if (disabled) return THEME.colors.text.muted;
    switch (variant) {
      case 'outline':
        return THEME.colors.accent.indigo;
      default:
        return '#FFFFFF';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 12 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 24 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 16 };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outlineBorder,
        getPadding(),
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: THEME.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: THEME.colors.accent.indigo
  },
  text: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    textAlign: 'center'
  }
});
