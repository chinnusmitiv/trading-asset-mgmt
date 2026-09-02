import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../constants/theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { useSettings } from '../../store/SettingsContext';

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { useMockData } = useSettings();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'manager' | 'trader') => {
    switch (role) {
      case 'admin':
        setUsername('admin');
        setPassword('admin123');
        break;
      case 'manager':
        setUsername('manager');
        setPassword('manager123');
        break;
      case 'trader':
        setUsername('trader1');
        setPassword('trader123');
        break;
    }
    setError(null);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 12) }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>📈</Text>
            </View>
            <Text style={styles.appTitle}>Asset Management</Text>
            <Text style={styles.appSubtitle}>Operations & Trading Command Center</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              Enter operator credentials to access financial dashboard
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Operator Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              placeholder="e.g. admin or trader1"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <Button
              title="Authenticate & Enter"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            {useMockData ? (
              <View style={styles.quickFillContainer}>
                <Text style={styles.quickFillLabel}>Development Quick Switch:</Text>
                <View style={styles.quickFillButtons}>
                  <TouchableOpacity
                    style={styles.quickBtn}
                    onPress={() => handleQuickFill('admin')}
                  >
                    <Text style={styles.quickBtnText}>Admin</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickBtn}
                    onPress={() => handleQuickFill('manager')}
                  >
                    <Text style={styles.quickBtnText}>Manager</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickBtn}
                    onPress={() => handleQuickFill('trader')}
                  >
                    <Text style={styles.quickBtnText}>Trader</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🔒 Secure Zero-Credential Architecture
            </Text>
            <Text style={styles.footerSubtext}>
              All transactions verified with SHA-256 and immutable audit logs.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: THEME.spacing.lg,
    flexGrow: 1,
    justifyContent: 'center'
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: THEME.colors.background.card,
    borderWidth: 1,
    borderColor: THEME.colors.accent.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md
  },
  logoIcon: {
    fontSize: 32
  },
  appTitle: {
    fontSize: THEME.typography.fontSize.xxl,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    letterSpacing: -0.5
  },
  appSubtitle: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    marginTop: 4
  },
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  cardSubtitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 4,
    marginBottom: THEME.spacing.md
  },
  errorBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.accent.rose,
    marginBottom: THEME.spacing.sm
  },
  errorText: {
    color: THEME.colors.accent.rose,
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600'
  },
  loginBtn: {
    marginTop: THEME.spacing.md
  },
  quickFillContainer: {
    marginTop: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider
  },
  quickFillLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginBottom: 8
  },
  quickFillButtons: {
    flexDirection: 'row',
    gap: THEME.spacing.sm
  },
  quickBtn: {
    flex: 1,
    backgroundColor: THEME.colors.background.cardElevated,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  quickBtnText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.accent.indigo,
    fontWeight: '700'
  },
  footer: {
    alignItems: 'center',
    marginTop: THEME.spacing.xl
  },
  footerText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  footerSubtext: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginTop: 2,
    textAlign: 'center'
  }
});
