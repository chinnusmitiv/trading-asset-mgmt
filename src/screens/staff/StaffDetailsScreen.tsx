import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { KpiCard } from '../../components/common/KpiCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { PercentageInput } from '../../components/common/PercentageInput';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { useAuth } from '../../store/AuthContext';
import { Staff, StaffBank, Trade, StaffCommission, StaffRole, StaffStatus } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

const QUICK_BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank'];

export const StaffDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { staffId } = route.params;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [banks, setBanks] = useState<StaffBank[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'trades' | 'commissions' | 'banks' | 'info'>('trades');

  // Edit Staff Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'Trader' as StaffRole,
    department: 'Trading Desk',
    tradingPercentage: 20,
    basicSalary: 60000,
    status: 'Active' as StaffStatus
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Staff Bank Modal State (Add & Edit)
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifscCode: '',
    accountType: 'Salary' as 'Salary' | 'Savings' | 'Current',
    upiId: '',
    isPrimary: false
  });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});

  // Delete Bank State
  const [deleteBankDialog, setDeleteBankDialog] = useState<{ visible: boolean; bank: StaffBank | null }>({
    visible: false,
    bank: null
  });

  const loadStaffData = useCallback(async () => {
    try {
      const data = await repository.getStaffDetails(staffId);
      setStaff(data.staff);
      setTrades(data.trades);
      setCommissions(data.commissions);
      setMetrics(data.metrics);
      setBanks(data.banks || (data.bank ? [data.bank] : []));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load staff details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, staffId]);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  // Open Edit Profile Modal
  const handleOpenEdit = () => {
    if (!staff) return;
    setEditForm({
      name: staff.name,
      phone: staff.phone,
      email: staff.email,
      role: staff.role,
      department: staff.department,
      tradingPercentage: staff.tradingPercentage,
      basicSalary: staff.basicSalary,
      status: staff.status
    });
    setEditErrors({});
    setEditModalVisible(true);
  };

  // Save Staff Profile Changes
  const handleSaveEdit = async () => {
    const errs: Record<string, string> = {};
    if (!editForm.name.trim()) errs.name = 'Full legal name is required';
    if (!editForm.phone.trim()) errs.phone = 'Phone number is required';
    if (!editForm.email.trim() || !editForm.email.includes('@')) errs.email = 'Valid email is required';
    if (editForm.tradingPercentage < 0 || editForm.tradingPercentage > 100) {
      errs.tradingPercentage = 'Percentage must be between 0% and 100%';
    }

    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setEditLoading(true);
    try {
      const updated = await repository.updateStaff(staffId, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        department: editForm.department.trim(),
        tradingPercentage: editForm.tradingPercentage,
        basicSalary: user?.role === 'Admin' ? editForm.basicSalary : staff?.basicSalary,
        status: editForm.status
      });

      setStaff(updated);
      setEditModalVisible(false);
      loadStaffData();
      Alert.alert('Staff Profile Updated', `Profile for ${updated.name} updated.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update staff member');
    } finally {
      setEditLoading(false);
    }
  };

  // --- BANK ACCOUNT HANDLERS ---
  const handleOpenAddBank = () => {
    setBankForm({
      accountHolderName: staff?.name || '',
      bankName: 'HDFC Bank',
      accountNumber: '',
      ifscCode: '',
      accountType: 'Salary',
      upiId: '',
      isPrimary: banks.length === 0
    });
    setBankErrors({});
    setIsEditingBank(false);
    setSelectedBankId(null);
    setBankModalVisible(true);
  };

  const handleOpenEditBank = (bank: StaffBank) => {
    setBankForm({
      accountHolderName: bank.accountHolderName,
      bankName: bank.bankName,
      accountNumber: bank.accountNumberMasked,
      ifscCode: bank.ifscCode,
      accountType: bank.accountType,
      upiId: bank.upiId || '',
      isPrimary: bank.isPrimary
    });
    setBankErrors({});
    setIsEditingBank(true);
    setSelectedBankId(bank.bankId);
    setBankModalVisible(true);
  };

  const handleSaveBank = async () => {
    const errs: Record<string, string> = {};
    if (!bankForm.accountHolderName.trim()) errs.accountHolderName = 'Account holder name is required';
    if (!bankForm.bankName.trim()) errs.bankName = 'Bank name is required';
    if (!bankForm.accountNumber.trim()) errs.accountNumber = 'Account number is required';
    if (!bankForm.ifscCode.trim()) errs.ifscCode = 'IFSC code is required';

    if (Object.keys(errs).length > 0) {
      setBankErrors(errs);
      return;
    }

    setBankLoading(true);
    try {
      const formattedAcc = bankForm.accountNumber.includes('XXXX')
        ? bankForm.accountNumber
        : `XXXX XXXX ${bankForm.accountNumber.slice(-4)}`;

      if (isEditingBank && selectedBankId) {
        await repository.updateStaffBank(selectedBankId, {
          accountHolderName: bankForm.accountHolderName.trim(),
          bankName: bankForm.bankName.trim(),
          accountNumberMasked: formattedAcc,
          ifscCode: bankForm.ifscCode.trim().toUpperCase(),
          accountType: bankForm.accountType,
          upiId: bankForm.upiId.trim() || undefined,
          isPrimary: bankForm.isPrimary
        });
        Alert.alert('Account Updated', 'Staff payout account updated successfully.');
      } else {
        await repository.addStaffBank({
          staffId,
          accountHolderName: bankForm.accountHolderName.trim(),
          bankName: bankForm.bankName.trim(),
          accountNumberMasked: formattedAcc,
          ifscCode: bankForm.ifscCode.trim().toUpperCase(),
          accountType: bankForm.accountType,
          upiId: bankForm.upiId.trim() || undefined,
          isPrimary: bankForm.isPrimary
        });
        Alert.alert('Account Attached', 'New payout bank account attached to staff profile.');
      }
      setBankModalVisible(false);
      loadStaffData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save staff bank account');
    } finally {
      setBankLoading(false);
    }
  };

  const handleSetPrimaryBank = async (bank: StaffBank) => {
    try {
      await repository.setPrimaryStaffBank(staffId, bank.bankId);
      loadStaffData();
      Alert.alert('Primary Account Changed', `${bank.bankName} is now the primary payout account for ${staff?.name}.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update primary account');
    }
  };

  const handleDeleteBank = async () => {
    if (!deleteBankDialog.bank) return;
    try {
      await repository.deleteStaffBank(deleteBankDialog.bank.bankId);
      setDeleteBankDialog({ visible: false, bank: null });
      loadStaffData();
      Alert.alert('Account Removed', 'Payout account removed from staff profile.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to remove bank account');
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Loading staff trading profile..." />;
  }

  if (!staff) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Staff Profile" user={user} />
        <EmptyState icon="⚠️" title="Staff Not Found" message="Could not locate the requested profile." />
      </SafeAreaView>
    );
  }

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={staff.name}
        subtitle={`${staff.role} • ${staff.department} (${staff.staffId})`}
        user={user}
        rightAction={
          canManage ? (
            <Button
              title="✏️ Edit"
              size="sm"
              variant="outline"
              onPress={handleOpenEdit}
            />
          ) : undefined
        }
      />

      {/* Profile Overview Card */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.profileTopRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{staff.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfoGroup}>
            <Text style={styles.staffNameText}>{staff.name}</Text>
            <Text style={styles.staffRoleText}>{staff.role} • {staff.department}</Text>
            <View style={styles.statusBadgeRow}>
              <StatusBadge status={staff.status} size="sm" />
              <Text style={styles.joiningText}>Joined {formatDate(staff.joiningDate)}</Text>
            </View>
          </View>
        </View>

        {/* Quick Contact Bar */}
        <View style={styles.contactBar}>
          <Text style={styles.contactText}>📞 {staff.phone}</Text>
          <Text style={styles.contactText}>✉️ {staff.email}</Text>
        </View>
      </View>

      {/* Performance Overview KPI Grid (Summary Above Tabs) */}
      <View style={styles.headerKpiGrid}>
        <KpiCard
          label="Total Realized P&L"
          value={metrics?.totalNetPnL || 0}
          compact
          accentColor={metrics?.totalNetPnL >= 0 ? THEME.colors.accent.emerald : THEME.colors.accent.rose}
          deltaText={`${metrics?.winningTrades || 0} Wins of ${metrics?.totalTrades || 0}`}
        />
        <KpiCard
          label="Trader Win Rate"
          value={`${metrics?.winRate?.toFixed(1) || '0'}%`}
          compact
          accentColor={THEME.colors.accent.cyan}
        />
      </View>

      {/* Tabs Navigation Strip */}
      <View style={styles.tabsStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'trades', label: `Trades (${trades.length})` },
            { key: 'commissions', label: `Commissions (${commissions.length})` },
            { key: 'banks', label: `Bank Accounts (${banks.length})` },
            { key: 'info', label: 'Compensation & Profile' }
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabPill,
                activeTab === t.key && styles.tabPillActive
              ]}
              onPress={() => setActiveTab(t.key as any)}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === t.key && styles.tabPillTextActive
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStaffData();
            }}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >

        {/* TAB 1: TRADES */}
        {activeTab === 'trades' && (
          <View style={styles.tabContent}>
            <View style={styles.tabActionsHeader}>
              <Text style={styles.sectionHeader}>LOGGED EXECUTIONS</Text>
              {canManage && (
                <Button
                  title="+ New Trade"
                  size="sm"
                  onPress={() => navigation.navigate('AddTrade', { prefilledStaffId: staff.staffId })}
                />
              )}
            </View>

            {trades.length === 0 ? (
              <EmptyState
                icon="📊"
                title="No Trades Logged"
                message="No trading executions recorded for this trader profile yet."
              />
            ) : (
              trades.map(t => {
                const isProfit = t.netPnL >= 0;

                return (
                  <TouchableOpacity
                    key={t.tradeId}
                    style={styles.card}
                    onPress={() => navigation.navigate('TradeDetails', { tradeId: t.tradeId })}
                  >
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardTitle}>{t.asset}</Text>
                        <Text style={styles.cardSub}>
                          {t.tradeType} • {formatDate(t.tradeDate)}
                        </Text>
                      </View>
                      <StatusBadge status={t.status} size="sm" />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.metricsRow}>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Capital Used</Text>
                        <Text style={styles.metricVal}>{formatCurrency(t.capitalUsed)}</Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Net P&L</Text>
                        <Text
                          style={[
                            styles.metricVal,
                            { color: isProfit ? THEME.colors.accent.emerald : THEME.colors.accent.rose }
                          ]}
                        >
                          {isProfit ? '+' : ''}
                          {formatCurrency(t.netPnL)}
                        </Text>
                      </View>
                      <View style={styles.metricCol}>
                        <Text style={styles.metricLabel}>Trader Cut</Text>
                        <Text style={[styles.metricVal, { color: THEME.colors.accent.indigo }]}>
                          {formatCurrency(t.staffShare)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: COMMISSIONS */}
        {activeTab === 'commissions' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionHeader}>COMMISSION LEDGER & PAYOUTS</Text>

            {commissions.length === 0 ? (
              <EmptyState
                icon="💰"
                title="No Commissions Accrued"
                message="Settled trades and profit distributions will record entries here."
              />
            ) : (
              commissions.map(c => (
                <View key={c.commissionId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>{c.commissionPeriod}</Text>
                      <Text style={styles.cardSub}>
                        {c.tradeId ? `Trade: ${c.tradeId}` : 'Consolidated Payout'}
                      </Text>
                    </View>
                    <StatusBadge status={c.status} size="sm" />
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.commissionRow}>
                    <Text style={styles.commLabel}>Base P&L Amount:</Text>
                    <Text style={styles.commValue}>{formatCurrency(c.baseAmount)}</Text>
                  </View>
                  <View style={styles.commissionRow}>
                    <Text style={styles.commLabel}>Applied Cut Rate:</Text>
                    <Text style={styles.commValue}>{c.appliedPercentage}%</Text>
                  </View>
                  <View style={[styles.commissionRow, styles.totalCommRow]}>
                    <Text style={styles.totalCommLabel}>Accrued Commission:</Text>
                    <Text style={styles.totalCommValue}>{formatCurrency(c.commissionAmount)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: BANK ACCOUNTS (MULTIPLE ACCOUNTS SUPPORT) */}
        {activeTab === 'banks' && (
          <View style={styles.tabContent}>
            <View style={styles.tabActionsHeader}>
              <Text style={styles.tabCountText}>{banks.length} Linked Payout Accounts</Text>
              {canManage && (
                <Button
                  title="+ Add Bank Account"
                  size="sm"
                  onPress={handleOpenAddBank}
                />
              )}
            </View>

            {banks.length === 0 ? (
              <EmptyState
                icon="🏦"
                title="No Payout Accounts Attached"
                message="Attach bank accounts or UPI IDs to disburse monthly salaries and trading commissions."
                actionLabel="+ Add Bank Account"
                onAction={handleOpenAddBank}
              />
            ) : (
              banks.map(b => (
                <View key={b.bankId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>{b.bankName}</Text>
                      <Text style={styles.cardSub}>Type: {b.accountType} Account</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <StatusBadge status={b.isPrimary ? 'Active' : 'Inactive'} size="sm" />
                      {canManage && (
                        <TouchableOpacity
                          style={styles.inlineEditBtn}
                          onPress={() => handleOpenEditBank(b)}
                        >
                          <Text style={styles.inlineEditBtnText}>✏️ Edit</Text>
                        </TouchableOpacity>
                      )}
                      {canManage && (
                        <TouchableOpacity
                          style={styles.inlineDeleteBtn}
                          onPress={() => setDeleteBankDialog({ visible: true, bank: b })}
                        >
                          <Text style={styles.inlineDeleteBtnText}>🗑️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.contactGrid}>
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Beneficiary Name</Text>
                      <Text style={styles.contactValue}>{b.accountHolderName}</Text>
                    </View>
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Account Number</Text>
                      <Text style={styles.contactValue}>{b.accountNumberMasked}</Text>
                    </View>
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>IFSC Code</Text>
                      <Text style={styles.contactValue}>{b.ifscCode}</Text>
                    </View>
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Disbursement Status</Text>
                      <Text style={[styles.contactValue, b.isPrimary && { color: THEME.colors.accent.emerald, fontWeight: '700' }]}>
                        {b.isPrimary ? '⭐ Primary Payout Account' : 'Secondary Account'}
                      </Text>
                    </View>
                  </View>

                  {b.upiId ? (
                    <View style={styles.upiRow}>
                      <Text style={styles.upiLabel}>UPI ID / VPA:</Text>
                      <Text style={styles.upiValue}>{b.upiId}</Text>
                    </View>
                  ) : null}

                  {!b.isPrimary && canManage && (
                    <TouchableOpacity
                      style={styles.setPrimaryBtn}
                      onPress={() => handleSetPrimaryBank(b)}
                    >
                      <Text style={styles.setPrimaryBtnText}>⭐ Set as Primary Disbursement Account</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: INFO */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            <View style={styles.tabActionsHeader}>
              <Text style={styles.sectionHeader}>COMPENSATION & PROFILE PARTICULARS</Text>
              {canManage && (
                <TouchableOpacity
                  style={styles.inlineEditBtn}
                  onPress={handleOpenEdit}
                >
                  <Text style={styles.inlineEditBtnText}>✏️ Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Role & Designation:</Text>
                <Text style={styles.infoValue}>{staff.role}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department:</Text>
                <Text style={styles.infoValue}>{staff.department}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Employment Status:</Text>
                <StatusBadge status={staff.status} size="sm" />
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Joining Date:</Text>
                <Text style={styles.infoValue}>{formatDate(staff.joiningDate)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trader Profit Cut %:</Text>
                <Text style={[styles.infoValue, { color: THEME.colors.accent.indigo, fontWeight: '700' }]}>
                  {staff.tradingPercentage}%
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Monthly Base Salary:</Text>
                <Text style={styles.infoValue}>
                  {user?.role === 'Admin' ? formatCurrency(staff.basicSalary) : '🔒 Restricted (Admin Only)'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{staff.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{staff.email}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* EDIT STAFF PROFILE MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.editModalTitle}>Edit Staff Profile</Text>
                <Text style={styles.editModalSub}>{staff.staffId}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              <Input
                label="Full Legal Name *"
                value={editForm.name}
                onChangeText={text => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder="e.g. Vikramaditya Singh"
                error={editErrors.name}
              />

              <Input
                label="Phone Number *"
                value={editForm.phone}
                onChangeText={text => setEditForm(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
                error={editErrors.phone}
              />

              <Input
                label="Email Address *"
                value={editForm.email}
                onChangeText={text => setEditForm(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="trader@vantaratrading.com"
                error={editErrors.email}
              />

              <Text style={styles.inputLabel}>Role Designation</Text>
              <View style={styles.statusPillsRow}>
                {(['Trader', 'Manager', 'Accountant', 'Support'] as const).map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.statusPill,
                      editForm.role === r && styles.statusPillActive
                    ]}
                    onPress={() => setEditForm(prev => ({ ...prev, role: r }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        editForm.role === r && styles.statusPillTextActive
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Department"
                value={editForm.department}
                onChangeText={text => setEditForm(prev => ({ ...prev, department: text }))}
                placeholder="e.g. Equities & Derivatives, Forex"
              />

              <PercentageInput
                label="Trader Profit Cut Rate (% of Trade P&L)"
                value={editForm.tradingPercentage}
                onChangeValue={val => setEditForm(prev => ({ ...prev, tradingPercentage: val }))}
              />

              {user?.role === 'Admin' && (
                <CurrencyInput
                  label="Monthly Base Salary (₹)"
                  value={editForm.basicSalary}
                  onChangeValue={val => setEditForm(prev => ({ ...prev, basicSalary: val }))}
                />
              )}

              <Text style={styles.inputLabel}>Employment Status</Text>
              <View style={styles.statusPillsRow}>
                {(['Active', 'Inactive', 'On_Leave'] as const).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPill,
                      editForm.status === st && styles.statusPillActive
                    ]}
                    onPress={() => setEditForm(prev => ({ ...prev, status: st }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        editForm.status === st && styles.statusPillTextActive
                      ]}
                    >
                      {st.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.editModalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Staff Profile"
                  variant="primary"
                  loading={editLoading}
                  onPress={handleSaveEdit}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ADD / EDIT STAFF BANK MODAL */}
      <Modal
        visible={bankModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBankModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.editModalTitle}>
                  {isEditingBank ? 'Edit Payout Account' : 'Attach Payout Account'}
                </Text>
                <Text style={styles.editModalSub}>Staff: {staff.name} ({staff.staffId})</Text>
              </View>
              <TouchableOpacity onPress={() => setBankModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              <Input
                label="Beneficiary / Account Holder Name *"
                value={bankForm.accountHolderName}
                onChangeText={text => setBankForm(prev => ({ ...prev, accountHolderName: text }))}
                placeholder="Name as per bank records"
                error={bankErrors.accountHolderName}
              />

              <Input
                label="Bank Name *"
                value={bankForm.bankName}
                onChangeText={text => setBankForm(prev => ({ ...prev, bankName: text }))}
                placeholder="e.g. HDFC Bank, ICICI Bank"
                error={bankErrors.bankName}
              />

              {/* Quick Bank Selection Pills */}
              <View style={styles.quickBanksRow}>
                {QUICK_BANKS.map(b => (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.quickBankPill,
                      bankForm.bankName === b && styles.quickBankPillActive
                    ]}
                    onPress={() => setBankForm(prev => ({ ...prev, bankName: b }))}
                  >
                    <Text
                      style={[
                        styles.quickBankPillText,
                        bankForm.bankName === b && styles.quickBankPillTextActive
                      ]}
                    >
                      {b.replace(' Bank', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Account Number *"
                value={bankForm.accountNumber}
                onChangeText={text => setBankForm(prev => ({ ...prev, accountNumber: text }))}
                placeholder="e.g. 50100234567890"
                keyboardType="numeric"
                error={bankErrors.accountNumber}
              />

              <Input
                label="IFSC Code *"
                value={bankForm.ifscCode}
                onChangeText={text => setBankForm(prev => ({ ...prev, ifscCode: text.toUpperCase() }))}
                placeholder="e.g. HDFC0000123"
                autoCapitalize="characters"
                error={bankErrors.ifscCode}
              />

              <Text style={styles.inputLabel}>Account Classification</Text>
              <View style={styles.statusPillsRow}>
                {(['Salary', 'Savings', 'Current'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.statusPill,
                      bankForm.accountType === type && styles.statusPillActive
                    ]}
                    onPress={() => setBankForm(prev => ({ ...prev, accountType: type }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        bankForm.accountType === type && styles.statusPillTextActive
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="UPI ID / VPA (Optional)"
                value={bankForm.upiId}
                onChangeText={text => setBankForm(prev => ({ ...prev, upiId: text }))}
                placeholder="e.g. trader@okhdfcbank"
                autoCapitalize="none"
              />

              {/* Primary Account Toggle */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setBankForm(prev => ({ ...prev, isPrimary: !prev.isPrimary }))}
              >
                <View style={[styles.checkbox, bankForm.isPrimary && styles.checkboxActive]}>
                  {bankForm.isPrimary && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Designate as Primary Disbursement Account</Text>
              </TouchableOpacity>

              <View style={styles.editModalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setBankModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={isEditingBank ? 'Save Account' : 'Attach Account'}
                  variant="primary"
                  loading={bankLoading}
                  onPress={handleSaveBank}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Bank Confirmation Dialog */}
      <ConfirmationDialog
        visible={deleteBankDialog.visible}
        title="Remove Payout Account"
        message={`Are you sure you want to remove the ${deleteBankDialog.bank?.bankName} account (${deleteBankDialog.bank?.accountNumberMasked}) from ${staff.name}'s profile?`}
        confirmLabel="Remove Account"
        variant="danger"
        onConfirm={handleDeleteBank}
        onCancel={() => setDeleteBankDialog({ visible: false, bank: null })}
      />
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
  profileHeaderCard: {
    backgroundColor: THEME.colors.background.card,
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.accent.indigo,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: '#FFF'
  },
  profileInfoGroup: {
    flex: 1
  },
  staffNameText: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  staffRoleText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  joiningText: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  contactBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider
  },
  contactText: {
    fontSize: 11,
    color: THEME.colors.text.secondary
  },
  tabsStrip: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider,
    backgroundColor: THEME.colors.background.primary
  },
  tabsScroll: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    gap: 8
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background.card,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  tabPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  tabPillText: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  tabPillTextActive: {
    color: '#FFF',
    fontWeight: '800'
  },
  headerKpiGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.xs
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.sm
  },
  tabContent: {
    gap: THEME.spacing.sm
  },
  tabActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  sectionHeader: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8
  },
  tabCountText: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8
  },
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  cardSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.background.divider,
    marginVertical: THEME.spacing.sm
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metricCol: {
    flex: 1
  },
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  metricVal: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    marginTop: 2
  },
  commissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  commLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
  },
  commValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  totalCommRow: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider,
    paddingTop: 6,
    marginTop: 4
  },
  totalCommLabel: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.accent.emerald
  },
  totalCommValue: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '800',
    color: THEME.colors.accent.emerald
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  contactItem: {
    width: '47%'
  },
  contactLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginBottom: 2
  },
  contactValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.text.primary
  },
  upiRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  upiLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  upiValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  },
  inlineEditBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  inlineEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  },
  inlineDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  inlineDeleteBtnText: {
    fontSize: 11
  },
  setPrimaryBtn: {
    marginTop: THEME.spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  setPrimaryBtnText: {
    color: THEME.colors.accent.emerald,
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.divider
  },
  infoLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
  },
  infoValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.text.primary
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginBottom: 6
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: THEME.spacing.sm
  },
  statusPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  statusPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  statusPillText: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  statusPillTextActive: {
    color: '#FFF',
    fontWeight: '800'
  },
  quickBanksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  quickBankPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  quickBankPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  quickBankPillText: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  quickBankPillTextActive: {
    color: '#FFF',
    fontWeight: '700'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    backgroundColor: THEME.colors.background.cardElevated,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxActive: {
    backgroundColor: THEME.colors.accent.emerald,
    borderColor: THEME.colors.accent.emerald
  },
  checkmark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800'
  },
  checkboxLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg
  },
  editModalContainer: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    padding: THEME.spacing.lg
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md
  },
  editModalTitle: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  editModalSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.accent.indigo,
    fontWeight: '700',
    marginTop: 2
  },
  modalCloseIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text.muted,
    padding: 4
  },
  editModalScroll: {
    paddingBottom: THEME.spacing.md,
    gap: THEME.spacing.sm
  },
  editModalActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md
  }
});
