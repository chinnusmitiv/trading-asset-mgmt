import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { PercentageInput } from '../../components/common/PercentageInput';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { StaffRole, UserRole } from '../../types';

export const AddStaffScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();

  // Staff particulars
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('Trader');
  const [department, setDepartment] = useState('Prop Trading');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [basicSalary, setBasicSalary] = useState<number>(80000);
  const [tradingPercentage, setTradingPercentage] = useState<number>(20);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // App login credentials state
  const [createLogin, setCreateLogin] = useState<boolean>(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('Staff@123');
  const [userRole, setUserRole] = useState<UserRole>('Staff');
  const [hasCustomUsername, setHasCustomUsername] = useState(false);
  const [hasCustomAccessRole, setHasCustomAccessRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Automatically suggest a clean username from the full name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!hasCustomUsername) {
      const derived = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '.');
      setUsername(derived);
    }
  };

  // Sync security access tier with staff role if user hasn't explicitly customized it
  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    if (!hasCustomAccessRole) {
      setUserRole(newRole === 'Manager' ? 'Manager' : 'Staff');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full staff name is required.');
      return;
    }
    if (!phone.trim() || phone.trim() === '+91') {
      Alert.alert('Validation Error', 'Contact phone number is required.');
      return;
    }

    if (createLogin) {
      if (!username.trim()) {
        Alert.alert('Validation Error', 'Operator username is required to create a login account.');
        return;
      }
      if (username.trim().length < 3) {
        Alert.alert('Validation Error', 'Operator username must be at least 3 characters long.');
        return;
      }
      if (!password.trim()) {
        Alert.alert('Validation Error', 'Password is required to create a login account.');
        return;
      }
      if (password.trim().length < 4) {
        Alert.alert('Validation Error', 'Password must be at least 4 characters long.');
        return;
      }
    }

    setLoading(true);
    try {
      const loginCredentials = createLogin
        ? {
            username: username.trim().toLowerCase(),
            password: password.trim(),
            role: userRole
          }
        : undefined;

      const created = await repository.createStaff(
        {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@assetmgmt.internal`,
          role,
          department: department.trim(),
          joiningDate: joiningDate.trim(),
          basicSalary,
          tradingPercentage,
          commissionPercentage,
          status: 'Active',
          notes: notes.trim() || undefined
        },
        loginCredentials
      );

      const successMessage = created.user
        ? `Added ${created.name} (${created.staffId})\n\n🔐 Login Account Created:\n• Username: ${created.user.username}\n• Temporary Password: ${password.trim()}\n• Access Tier: ${created.user.role}\n\nThis operator can now sign in immediately.`
        : `Successfully added ${created.name} (${created.staffId}) with ${created.tradingPercentage}% profit cut.`;

      Alert.alert(
        created.user ? 'Staff & Login Created' : 'Staff Onboarded',
        successMessage,
        [
          {
            text: 'View Staff Profile',
            onPress: () => {
              navigation.replace('StaffDetails', { staffId: created.staffId });
            }
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create staff record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Onboard Staff / Trader"
        subtitle="Configure Profile, Policies & App Access"
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Personal Particulars */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PERSONAL & ROLE PARTICULARS</Text>

            <Input
              label="Full Name *"
              value={name}
              onChangeText={handleNameChange}
              placeholder="e.g. Sunil Gavaskar"
            />

            <Input
              label="Phone Number *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98111 22334"
            />

            <Input
              label="Corporate Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="sunil@assetmgmt.internal"
            />

            {/* Role Selector */}
            <Text style={styles.inputLabel}>Role Designation *</Text>
            <View style={styles.roleGrid}>
              {(['Trader', 'Manager', 'Accountant', 'Support'] as StaffRole[]).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.rolePill,
                    role === r && styles.rolePillActive
                  ]}
                  onPress={() => handleRoleChange(r)}
                >
                  <Text
                    style={[
                      styles.rolePillText,
                      role === r && styles.rolePillTextActive
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Department / Team *"
              value={department}
              onChangeText={setDepartment}
              placeholder="e.g. Prop Trading, Operations, Risk"
            />

            <Input
              label="Joining Date (YYYY-MM-DD) *"
              value={joiningDate}
              onChangeText={setJoiningDate}
              placeholder="2026-09-02"
            />
          </View>

          {/* Portal Access & Login Credentials */}
          <View style={styles.card}>
            <View style={styles.loginCardHeader}>
              <View style={styles.loginTitleGroup}>
                <Text style={styles.cardTitle}>PORTAL ACCESS & LOGIN CREDENTIALS</Text>
                <Text style={styles.cardSubtitle}>
                  Create an app login account for this staff member
                </Text>
              </View>
              <Switch
                value={createLogin}
                onValueChange={setCreateLogin}
                trackColor={{ false: THEME.colors.background.border, true: THEME.colors.accent.indigo }}
                thumbColor="#FFF"
              />
            </View>

            {createLogin ? (
              <View style={styles.loginSectionBody}>
                <View style={styles.loginNoticeBox}>
                  <Text style={styles.loginNoticeIcon}>🔐</Text>
                  <Text style={styles.loginNoticeText}>
                    Enables mobile app authentication immediately upon saving.
                  </Text>
                </View>

                <Input
                  label="Operator Username *"
                  value={username}
                  onChangeText={(val) => {
                    setHasCustomUsername(true);
                    setUsername(val);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="e.g. sunil.gavaskar or trader2"
                  helperText="Lowercase alphanumeric username used to log in"
                />

                <View style={styles.passwordRow}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Initial Password *"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="••••••••"
                      helperText="Default password for operator's first sign in"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.eyeToggleBtn}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeToggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Security Access Tier *</Text>
                <View style={styles.roleGrid}>
                  {(['Staff', 'Manager', 'Admin'] as UserRole[]).map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.rolePill,
                        userRole === r && styles.rolePillActive
                      ]}
                      onPress={() => {
                        setHasCustomAccessRole(true);
                        setUserRole(r);
                      }}
                    >
                      <Text
                        style={[
                          styles.rolePillText,
                          userRole === r && styles.rolePillTextActive
                        ]}
                      >
                        {r === 'Staff' ? '📈 Staff' : r === 'Manager' ? '👔 Manager' : '👑 Admin'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.scopeBadge}>
                  <Text style={styles.scopeBadgeText}>
                    {userRole === 'Staff' && '👤 Personal Workspace: Restricted to own trade logging, own salary slip, and commission ledger.'}
                    {userRole === 'Manager' && '👔 Desk Operations: Manages investor accounts, reviews trading books, and approves expenses.'}
                    {userRole === 'Admin' && '👑 Super Admin: Unrestricted firm-wide access, unmasked banking, executive payroll, and audit logs.'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.loginDisabledBox}>
                <Text style={styles.loginDisabledText}>
                  ⚠️ No portal login will be created. This staff member will only exist as an HR and payroll record.
                </Text>
              </View>
            )}
          </View>

          {/* Compensation & Policy */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>COMPENSATION & PROFIT SHARING POLICIES</Text>

            <PercentageInput
              label="Trader Profit Cut Percentage *"
              value={tradingPercentage}
              onChangeValue={setTradingPercentage}
              placeholder="20"
              helperText="Cut applied to positive Net P&L generated by this trader"
            />

            <CurrencyInput
              label="Monthly Basic Salary"
              value={basicSalary}
              onChangeValue={setBasicSalary}
              placeholder="80,000"
            />

            <PercentageInput
              label="Volume Commission Percentage"
              value={commissionPercentage}
              onChangeValue={setCommissionPercentage}
              placeholder="0"
            />

            <Input
              label="Special Notes & Mandates"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Futures & Options specialized book"
            />
          </View>

          <Button
            title={createLogin ? 'Create Staff Profile & Login Account' : 'Create Staff Profile'}
            onPress={handleSave}
            loading={loading}
            style={styles.saveBtn}
          />
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
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginBottom: THEME.spacing.sm
  },
  loginCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xs
  },
  loginTitleGroup: {
    flex: 1,
    paddingRight: THEME.spacing.sm
  },
  loginSectionBody: {
    marginTop: THEME.spacing.xs
  },
  loginNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    marginBottom: THEME.spacing.sm
  },
  loginNoticeIcon: {
    fontSize: 14,
    marginRight: THEME.spacing.sm
  },
  loginNoticeText: {
    flex: 1,
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.accent.indigo,
    fontWeight: '600'
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  eyeToggleBtn: {
    marginTop: 38,
    marginLeft: THEME.spacing.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  eyeToggleText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.accent.indigo,
    fontWeight: '700'
  },
  scopeBadge: {
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    marginTop: THEME.spacing.xs
  },
  scopeBadgeText: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    lineHeight: 16
  },
  loginDisabledBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginTop: THEME.spacing.xs
  },
  loginDisabledText: {
    fontSize: THEME.typography.fontSize.xs,
    color: '#F59E0B',
    lineHeight: 16
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginTop: THEME.spacing.sm,
    marginBottom: 6
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  rolePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  rolePillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  rolePillText: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    fontWeight: '700'
  },
  rolePillTextActive: {
    color: '#FFF'
  },
  saveBtn: {
    marginTop: THEME.spacing.xs
  }
});
