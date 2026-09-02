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
  TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { PercentageInput } from '../../components/common/PercentageInput';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { StaffRole } from '../../types';

export const AddStaffScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();

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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full staff name is required.');
      return;
    }
    if (!phone.trim() || phone.trim() === '+91') {
      Alert.alert('Validation Error', 'Contact phone number is required.');
      return;
    }

    setLoading(true);
    try {
      const created = await repository.createStaff({
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
      });

      Alert.alert(
        'Staff Onboarded',
        `Successfully added ${created.name} (${created.staffId}) with ${created.tradingPercentage}% profit cut.`,
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
        subtitle="Configure Roles & Profit Policies"
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>PERSONAL & ROLE PARTICULARS</Text>

            <Input
              label="Full Name *"
              value={name}
              onChangeText={setName}
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
                  onPress={() => setRole(r)}
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
            title="Create Staff Profile"
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
    marginBottom: THEME.spacing.sm
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
