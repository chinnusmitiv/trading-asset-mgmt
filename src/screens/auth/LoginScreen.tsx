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
  Image,
  Alert
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
  const { useMockData, setUseMockData, apiUrl, setApiUrl } = useSettings();
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
      const errMsg = err.message || 'Login failed. Please check credentials.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'manager' | 'trader1' | 'trader2') => {
    switch (role) {
      case 'admin':
        setUsername('admin');
        setPassword('admin123');
        break;
      case 'manager':
        setUsername('manager');
        setPassword('manager123');
        break;
      case 'trader1':
        setUsername('trader1');
        setPassword('trader123');
        break;
      case 'trader2':
        setUsername('priya');
        setPassword('trader123');
        break;
    }
    setError(null);
  };

  const handleToggleBackendMode = async () => {
    setError(null);
    await setUseMockData(!useMockData);
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
            {/* Backend Connectivity Banner */}
            <View style={styles.backendModeRow}>
              <View style={styles.backendStatusBadge}>
                <View style={[styles.statusDot, useMockData ? styles.statusDotMock : styles.statusDotLive]} />
                <Text style={styles.backendStatusText}>
                  {useMockData ? 'Offline Mock Mode' : 'Live Google Sheets'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.switchModeBtn}
                onPress={handleToggleBackendMode}
                activeOpacity={0.7}
              >
                <Text style={styles.switchModeBtnText}>
                  {useMockData ? 'Use Live Sheet' : 'Use Mock Data'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>
              {useMockData
                ? 'Offline development session with instant in-memory records'
                : 'Connected to Live Google Spreadsheet database'}
            </Text>

            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
                {!useMockData && (
                  <TouchableOpacity
                    style={styles.errorFallbackBtn}
                    onPress={() => setUseMockData(true)}
                  >
                    <Text style={styles.errorFallbackText}>
                      Tap here to switch to Offline Mock Mode
                    </Text>
                  </TouchableOpacity>
                )}
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

            {/* Quick Fill Credentials (always accessible for rapid authentication) */}
            <View style={styles.quickFillContainer}>
              <Text style={styles.quickFillLabel}>1-Tap Demo Credentials:</Text>
              <View style={styles.quickFillButtons}>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => handleQuickFill('admin')}
                >
                  <Text style={styles.quickBtnText}>👑 Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => handleQuickFill('manager')}
                >
                  <Text style={styles.quickBtnText}>👔 Manager</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => handleQuickFill('trader1')}
                >
                  <Text style={styles.quickBtnText}>📈 Trader 1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => handleQuickFill('trader2')}
                >
                  <Text style={styles.quickBtnText}>📈 Trader 2</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    marginBottom: THEME.spacing.lg
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
  backendModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.background.cardElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    marginBottom: THEME.spacing.md
  },
  backendStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusDotLive: {
    backgroundColor: '#10B981'
  },
  statusDotMock: {
    backgroundColor: '#F59E0B'
  },
  backendStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  switchModeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: 'rgba(99, 102, 241, 0.15)'
  },
  switchModeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
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
  errorFallbackBtn: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 63, 94, 0.2)'
  },
  errorFallbackText: {
    color: THEME.colors.accent.indigo,
    fontSize: 11,
    fontWeight: '700'
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
    gap: 6
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
    fontSize: 10,
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
