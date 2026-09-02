import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert
} from 'react-native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useSettings } from '../../store/SettingsContext';
import { useAuth } from '../../store/AuthContext';

export const SettingsScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    useMockData,
    apiUrl,
    currency,
    timezone,
    setUseMockData,
    setApiUrl,
    setCurrency,
    setTimezone
  } = useSettings();

  const [inputUrl, setInputUrl] = useState(apiUrl);
  const [inputCurrency, setInputCurrency] = useState(currency);
  const [inputTimezone, setInputTimezone] = useState(timezone);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setApiUrl(inputUrl.trim());
      await setCurrency(inputCurrency.trim());
      await setTimezone(inputTimezone.trim());
      Alert.alert('Settings Saved', 'System configurations have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Settings & Config"
        subtitle="Backend API & Operational Parameters"
        user={user}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Environment & Data Mode */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DATA REPOSITORY MODE</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.switchLabel}>Offline Mock Development Mode</Text>
              <Text style={styles.switchDesc}>
                Uses local in-memory seed dataset (5 Investors, 3 Staff, 30 Trades, 10 Expenses).
              </Text>
            </View>
            <Switch
              value={useMockData}
              onValueChange={val => setUseMockData(val)}
              trackColor={{ false: THEME.colors.background.border, true: THEME.colors.accent.indigo }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Live Google Apps Script Endpoint */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>LIVE GOOGLE APPS SCRIPT GATEWAY</Text>
          <Text style={styles.cardSubtitle}>
            When mock mode is off, all transactions are routed via HTTPS to this Google Web App.
          </Text>

          <Input
            label="Google Apps Script Web App URL"
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            placeholder="https://script.google.com/macros/s/.../exec"
          />

          <View style={styles.securityPill}>
            <Text style={styles.securityText}>
              🛡️ Zero credentials stored on device. Authentication handled via ephemeral session tokens.
            </Text>
          </View>
        </View>

        {/* Currency & Localization */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>LOCALIZATION & CURRENCY</Text>

          <Input
            label="Default Currency Code"
            value={inputCurrency}
            onChangeText={setInputCurrency}
            placeholder="INR"
          />

          <Input
            label="System Timezone"
            value={inputTimezone}
            onChangeText={setInputTimezone}
            placeholder="Asia/Kolkata"
          />
        </View>

        <Button
          title="Save Configurations"
          onPress={handleSave}
          loading={saving}
          style={styles.saveBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background.primary
  },
  container: {
    flex: 1
  },
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xxl,
    gap: THEME.spacing.md
  },
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8,
    marginBottom: THEME.spacing.sm
  },
  cardSubtitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    lineHeight: 18,
    marginBottom: THEME.spacing.sm
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.xs
  },
  switchTextGroup: {
    flex: 1,
    marginRight: THEME.spacing.md
  },
  switchLabel: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  switchDesc: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  securityPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    marginTop: THEME.spacing.xs
  },
  securityText: {
    fontSize: 11,
    color: THEME.colors.accent.emerald,
    lineHeight: 16
  },
  saveBtn: {
    marginTop: THEME.spacing.sm
  }
});
