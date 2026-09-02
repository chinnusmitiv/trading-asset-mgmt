import React, { useState, useEffect } from 'react';
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
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { Staff, PaymentMethod } from '../../types';
import { calculateNetSalary } from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';
import { getCurrentMonthPeriod } from '../../utils/date';

export const ProcessPayrollScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const prefilledStaffId = route.params?.staffId;

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(prefilledStaffId || '');
  const [salaryMonth, setSalaryMonth] = useState<string>(getCurrentMonthPeriod());
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [commission, setCommission] = useState<number>(0);
  const [allowance, setAllowance] = useState<number>(0);
  const [bonus, setBonus] = useState<number>(0);
  const [deduction, setDeduction] = useState<number>(0);
  const [advance, setAdvance] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank_Transfer');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const list = await repository.getStaffList();
      setStaffList(list);
      if (!selectedStaffId && list.length > 0) {
        handleSelectStaff(list[0]);
      } else if (selectedStaffId) {
        const found = list.find(s => s.staffId === selectedStaffId);
        if (found) handleSelectStaff(found);
      }
    } catch (e) {
      // Ignore
    }
  };

  const handleSelectStaff = async (staff: Staff) => {
    setSelectedStaffId(staff.staffId);
    setBasicSalary(staff.basicSalary);
    try {
      const unpaid = await repository.getStaffUnpaidCommissions(staff.staffId, salaryMonth);
      setCommission(unpaid);
    } catch (e) {
      setCommission(0);
    }
  };

  // Real-time calculation of Net Salary
  const netSalary = calculateNetSalary(
    basicSalary,
    allowance,
    bonus,
    commission,
    deduction,
    advance
  );

  const handleSave = async () => {
    if (!selectedStaffId) {
      Alert.alert('Validation Error', 'Please select a staff member.');
      return;
    }
    if (netSalary <= 0) {
      Alert.alert('Validation Error', 'Net payout salary must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const requestId = 'REQ-SAL-' + Date.now();
      const created = await repository.createSalary(
        {
          staffId: selectedStaffId,
          salaryMonth,
          basicSalary,
          allowance,
          bonus,
          commission,
          deduction,
          advance,
          netSalary,
          paymentDate,
          paymentMethod,
          paymentStatus: 'Approved',
          notes: notes.trim() || undefined,
          approvedBy: user?.userId || 'USR-00001',
          approvedAt: new Date().toISOString()
        },
        requestId
      );

      Alert.alert(
        'Payroll Slip Generated',
        `Generated ${formatCurrency(created.netSalary)} salary slip for ${salaryMonth}.`,
        [
          {
            text: 'View Salary Slip',
            onPress: () => navigation.replace('SalaryDetails', { salaryId: created.salaryId })
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to process salary.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Process Staff Payroll"
        subtitle="Monthly Salary & Commission Slip"
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Real-time Net Salary Highlight Card */}
          <View style={styles.netBanner}>
            <Text style={styles.netBannerTitle}>NET DISBURSEMENT SALARY</Text>
            <Text style={styles.netBannerValue}>{formatCurrency(netSalary)}</Text>
            <Text style={styles.netBannerSubtitle}>
              Basic ({formatCurrency(basicSalary)}) + Commission ({formatCurrency(commission)}) + Bonus ({formatCurrency(bonus)}) - Deductions ({formatCurrency(deduction + advance)})
            </Text>
          </View>

          {/* Select Staff Member */}
          {staffList.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>SELECT STAFF / TRADER</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffRow}>
                {staffList.map(s => (
                  <TouchableOpacity
                    key={s.staffId}
                    style={[
                      styles.staffPill,
                      selectedStaffId === s.staffId && styles.staffPillActive
                    ]}
                    onPress={() => handleSelectStaff(s)}
                  >
                    <Text
                      style={[
                        styles.staffName,
                        selectedStaffId === s.staffId && styles.staffTextActive
                      ]}
                    >
                      {s.name}
                    </Text>
                    <Text
                      style={[
                        styles.staffSub,
                        selectedStaffId === s.staffId && styles.staffTextActive
                      ]}
                    >
                      {s.role} • {s.department}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Compensation Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SALARY COMPONENTS</Text>

            <Input
              label="Payroll Month (YYYY-MM) *"
              value={salaryMonth}
              onChangeText={setSalaryMonth}
              placeholder="2026-09"
            />

            <CurrencyInput
              label="Basic Monthly Salary *"
              value={basicSalary}
              onChangeValue={setBasicSalary}
              placeholder="0"
            />

            <CurrencyInput
              label="Approved Trading Commissions"
              value={commission}
              onChangeValue={setCommission}
              placeholder="0"
            />

            <CurrencyInput
              label="Allowances / Reimbursements"
              value={allowance}
              onChangeValue={setAllowance}
              placeholder="0"
            />

            <CurrencyInput
              label="Performance Bonus / Incentive"
              value={bonus}
              onChangeValue={setBonus}
              placeholder="0"
            />

            <CurrencyInput
              label="Standard Deductions (TDS / PF)"
              value={deduction}
              onChangeValue={setDeduction}
              placeholder="0"
            />

            <CurrencyInput
              label="Salary Advance Repayment"
              value={advance}
              onChangeValue={setAdvance}
              placeholder="0"
            />
          </View>

          {/* Payment Rail */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>DISBURSEMENT DETAILS</Text>

            <Input
              label="Scheduled Payment Date (YYYY-MM-DD)"
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="2026-09-02"
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodRow}>
              {(['Bank_Transfer', 'UPI', 'Cheque', 'Cash'] as PaymentMethod[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodBtn,
                    paymentMethod === m && styles.methodBtnActive
                  ]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodBtnText,
                      paymentMethod === m && styles.methodBtnTextActive
                    ]}
                  >
                    {m.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Payroll Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Regular monthly payroll run"
            />
          </View>

          <Button
            title="Generate Salary Slip"
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
  netBanner: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  netBannerTitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  netBannerValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '800',
    color: THEME.colors.accent.emerald,
    marginVertical: 4
  },
  netBannerSubtitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    textAlign: 'center'
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
  staffRow: {
    gap: 8
  },
  staffPill: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    minWidth: 130
  },
  staffPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  staffName: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  staffSub: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  staffTextActive: {
    color: '#FFF'
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginTop: THEME.spacing.sm,
    marginBottom: 6
  },
  methodRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  methodBtnActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  methodBtnText: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    fontWeight: '700'
  },
  methodBtnTextActive: {
    color: '#FFF'
  },
  saveBtn: {
    marginTop: THEME.spacing.xs
  }
});
