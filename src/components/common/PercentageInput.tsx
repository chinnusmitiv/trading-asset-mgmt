import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from './Input';
import { THEME } from '../../constants/theme';

interface PercentageInputProps {
  label: string;
  value: number | string;
  onChangeValue: (num: number) => void;
  error?: string;
  placeholder?: string;
  helperText?: string;
}

export const PercentageInput: React.FC<PercentageInputProps> = ({
  label,
  value,
  onChangeValue,
  error,
  placeholder = '0',
  helperText
}) => {
  const handleChangeText = (text: string) => {
    const clean = text.replace(/[^0-9.]/g, '');
    let num = parseFloat(clean);
    if (isNaN(num)) num = 0;
    if (num > 100) num = 100;
    if (num < 0) num = 0;
    onChangeValue(num);
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
      rightIcon={<Text style={styles.symbolText}>%</Text>}
    />
  );
};

const styles = StyleSheet.create({
  symbolText: {
    color: THEME.colors.accent.indigo,
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800'
  }
});
