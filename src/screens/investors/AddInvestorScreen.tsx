import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';

export const AddInvestorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = async () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Full legal name is required';
    if (!phone.trim() || phone.trim() === '+91') errs.phone = 'Valid phone number is required';
    if (email.trim() && !email.includes('@')) errs.email = 'Valid email format required';

    // Duplicate check
    if (!errs.phone) {
      const existing = await repository.getInvestors();
      const duplicate = existing.find(
        i => i.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, '')
      );
      if (duplicate) {
        errs.phone = `Phone already registered to ${duplicate.name} (${duplicate.investorId})`;
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    const isValid = await validate();
    if (!isValid) return;

    setLoading(true);
    try {
      const created = await repository.createInvestor({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        joiningDate: joiningDate.trim(),
        status: 'Active',
        notes: notes.trim() || undefined
      });

      Alert.alert(
        'Investor Registered',
        `Successfully created profile ${created.name} (${created.investorId}).`,
        [
          {
            text: 'Open Investor Profile',
            onPress: () => {
              navigation.replace('InvestorDetails', { investorId: created.investorId });
            }
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create investor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Onboard Investor" subtitle="Create New Capital Account" user={user} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>LEGAL & CONTACT PARTICULARS</Text>

            <Input
              label="Full Legal Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ramesh Chandra Verma"
              error={errors.name}
            />

            <Input
              label="Primary Phone Number *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+91 98765 43210"
              error={errors.phone}
            />

            <Input
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="investor@example.com"
              error={errors.email}
            />

            <Input
              label="Residential / Office Address"
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. Bandra West, Mumbai"
            />

            <Input
              label="Onboarding Date (YYYY-MM-DD)"
              value={joiningDate}
              onChangeText={setJoiningDate}
              placeholder="2026-09-02"
            />

            <Input
              label="Account Notes & Investor Category"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Family Office, HNI, Direct Referral"
            />
          </View>

          <Button
            title="Register Investor Profile"
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
    paddingBottom: THEME.spacing.xxl
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
  saveBtn: {
    marginTop: THEME.spacing.lg
  }
});
