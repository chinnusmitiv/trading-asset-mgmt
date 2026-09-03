import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image
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
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>VANTARA</Text>
            <Text style={styles.appSubtitle}>TRADING COMPANY • OPERATIONS HUB</Text>
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
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 20,
    marginBottom: THEME.spacing.sm
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#D4AF37', // Gold
    letterSpacing: 2
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
