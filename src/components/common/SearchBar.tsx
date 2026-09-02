import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { THEME } from '../../constants/theme';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onSearch: (text: string) => void;
  debounceMs?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search by name, ID or status...',
  value = '',
  onSearch,
  debounceMs = 250
}) => {
  const [searchTerm, setSearchTerm] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.searchIcon}>🔍</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={THEME.colors.text.muted}
        value={searchTerm}
        onChangeText={setSearchTerm}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {searchTerm.length > 0 ? (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    paddingHorizontal: THEME.spacing.md,
    marginVertical: THEME.spacing.sm
  },
  searchIcon: {
    fontSize: 14,
    marginRight: THEME.spacing.sm
  },
  input: {
    flex: 1,
    color: THEME.colors.text.primary,
    fontSize: THEME.typography.fontSize.sm,
    paddingVertical: 10
  },
  clearButton: {
    padding: 4
  },
  clearText: {
    color: THEME.colors.text.muted,
    fontSize: 14,
    fontWeight: '700'
  }
});
