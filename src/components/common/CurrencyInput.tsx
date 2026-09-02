import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from './Input';
import { THEME } from '../../constants/theme';

interface CurrencyInputProps {
  label: string;
  value: number | string;
  onChangeValue: (num: number) => void;
  error?: string;
  placeholder?: string;
  helperText?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChangeValue,
  error,
  placeholder = '0',
  helperText
}) => {
  const handleChangeText = (text: string) => {
    const clean = text.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    onChangeValue(isNaN(num) ? 0 : num);
  };

  return (
    <Input
      label={label}
      value={value ? String(value) : ''}
      onChangeText={handleChangeText}
      keyboardType="numeric"
      placeholder={placeholder}
      error={error}
      helperText={helperText}
      leftIcon={
        <Text style={styles.symbolText}>₹</Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  symbolText: {
    color: THEME.colors.accent.emerald,
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800'
  }
});
