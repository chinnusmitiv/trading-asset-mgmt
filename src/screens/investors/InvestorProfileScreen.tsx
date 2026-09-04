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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking
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
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import {
  Investor,
  InvestorBank,
  Investment,
  InvestorPayment,
  InvestorDocument,
  PaymentFrequency,
  InvestmentStatus
} from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { maskBankAccount } from '../../utils/masking';
import {
  calculateOutstandingPrincipal,
  calculateInvestorProfitPaid,
  calculateInvestorMonthlyReturn
} from '../../utils/calculations';

type TabKey = 'overview' | 'investments' | 'payments' | 'bank' | 'documents';

export const InvestorProfileScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const { investorId } = route.params;

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [bank, setBank] = useState<InvestorBank | null>(null);
  const [banks, setBanks] = useState<InvestorBank[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [payments, setPayments] = useState<InvestorPayment[]>([]);
  const [documents, setDocuments] = useState<InvestorDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Investor Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    status: 'Active' as Investor['status'],
    notes: ''
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Edit Investment Tranche Modal State
  const [editTrancheModalVisible, setEditTrancheModalVisible] = useState(false);
  const [selectedTranche, setSelectedTranche] = useState<Investment | null>(null);
  const [trancheForm, setTrancheForm] = useState({
    principalAmount: 5000000,
    returnPercentage: 2.5,
    paymentFrequency: 'Monthly' as PaymentFrequency,
    status: 'Active' as InvestmentStatus,
    maturityDate: '',
    notes: ''
  });
  const [trancheEditLoading, setTrancheEditLoading] = useState(false);

  // Bank Edit / Add Modal State
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState<InvestorBank | null>(null);
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountType: 'Savings' as 'Savings' | 'Current',
    isPrimary: true
  });
  const [bankEditLoading, setBankEditLoading] = useState(false);
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});

  // Document Edit / Add Modal State
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<InvestorDocument | null>(null);
  const [docForm, setDocForm] = useState({
    documentName: '',
    documentType: 'Agreement' as InvestorDocument['documentType'],
    driveUrl: '',
    expiryDate: '',
    status: 'Valid' as InvestorDocument['status']
  });
  const [docEditLoading, setDocEditLoading] = useState(false);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});

  // Confirmation modal state for marking payment as paid
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<{
    visible: boolean;
    payment: InvestorPayment | null;
  }>({ visible: false, payment: null });

  // Reversal modal state
  const [reverseModal, setReverseModal] = useState<{
    visible: boolean;
    payment: InvestorPayment | null;
    reason: string;
  }>({ visible: false, payment: null, reason: '' });

  const loadProfileData = useCallback(async () => {
    try {
      const details = await repository.getInvestorDetails(investorId);
      setInvestor(details.investor);
      setBank(details.bank || null);
      setBanks(details.banks || (details.bank ? [details.bank] : []));
      setInvestments(details.investments);
      setPayments(details.payments);
      setDocuments(details.documents || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load investor profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, investorId]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Derived financial metrics
  const totalPrincipal = investments.reduce((sum, inv) => sum + inv.principalAmount, 0);
  const totalPrincipalRepaid = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + (p.principalAmount || 0), 0);
  const outstandingPrincipal = calculateOutstandingPrincipal(totalPrincipal, totalPrincipalRepaid);
  const totalProfitPaid = calculateInvestorProfitPaid(payments);
  const currentMonthlyReturnExpected = investments
    .filter(inv => inv.status === 'Active')
    .reduce((sum, inv) => sum + inv.monthlyReturn, 0);

  // Open Edit Profile Modal
  const handleOpenEdit = () => {
    if (!investor) return;
    setEditForm({
      name: investor.name,
      phone: investor.phone,
      email: investor.email || '',
      address: investor.address || '',
      status: investor.status,
      notes: investor.notes || ''
    });
    setEditErrors({});
    setEditModalVisible(true);
  };

  // Save Edit Profile Changes
  const handleSaveEdit = async () => {
    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = 'Full legal name is required';
    if (!editForm.phone.trim()) errors.phone = 'Phone number is required';
    if (editForm.email.trim() && !editForm.email.includes('@')) errors.email = 'Valid email is required';

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditLoading(true);
    try {
      const updated = await repository.updateInvestor(investorId, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim() || undefined,
        address: editForm.address.trim() || undefined,
        status: editForm.status,
        notes: editForm.notes.trim() || undefined
      });
      setInvestor(updated);
      setEditModalVisible(false);
      loadProfileData();
      Alert.alert('Profile Updated', `Investor details for ${updated.name} updated successfully.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update investor profile');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Edit Tranche Modal
  const handleOpenEditTranche = (tranche: Investment) => {
    setSelectedTranche(tranche);
    setTrancheForm({
      principalAmount: tranche.principalAmount,
      returnPercentage: tranche.returnPercentage,
      paymentFrequency: tranche.paymentFrequency,
      status: tranche.status,
      maturityDate: tranche.maturityDate || '',
      notes: tranche.notes || ''
    });
    setEditTrancheModalVisible(true);
  };

  // Live calculation for tranche edit modal
  const liveTrancheMonthlyPayout = calculateInvestorMonthlyReturn(
    trancheForm.principalAmount,
    trancheForm.returnPercentage,
    trancheForm.paymentFrequency
  );

  // Save Edit Tranche Changes
  const handleSaveEditTranche = async () => {
    if (!selectedTranche) return;
    if (trancheForm.principalAmount <= 0) {
      Alert.alert('Validation Error', 'Principal amount must be greater than zero.');
      return;
    }
    if (trancheForm.returnPercentage < 0 || trancheForm.returnPercentage > 100) {
      Alert.alert('Validation Error', 'Return percentage must be between 0% and 100%.');
      return;
    }

    setTrancheEditLoading(true);
    try {
      await repository.updateInvestment(selectedTranche.investmentId, {
        principalAmount: trancheForm.principalAmount,
        returnPercentage: trancheForm.returnPercentage,
        paymentFrequency: trancheForm.paymentFrequency,
        status: trancheForm.status,
        maturityDate: trancheForm.maturityDate.trim() || undefined,
        notes: trancheForm.notes.trim() || undefined
      });
      setEditTrancheModalVisible(false);
      loadProfileData();
      Alert.alert(
        'Tranche Updated',
        `Tranche ${selectedTranche.investmentId} updated with ${formatCurrency(liveTrancheMonthlyPayout)}/month expected payout.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update investment tranche.');
    } finally {
      setTrancheEditLoading(false);
    }
  };

  // Open Add Bank Modal
  const handleOpenAddBank = () => {
    setSelectedBank(null);
    setBankForm({
      accountHolderName: investor?.name || '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      accountType: 'Savings',
      isPrimary: banks.length === 0
    });
    setBankErrors({});
    setBankModalVisible(true);
  };

  // Open Edit Bank Modal
  const handleOpenEditBank = (b: InvestorBank) => {
    setSelectedBank(b);
    setBankForm({
      accountHolderName: b.accountHolderName,
      bankName: b.bankName,
      accountNumber: b.accountNumberMasked,
      ifscCode: b.ifscCode,
      accountType: b.accountType,
      isPrimary: b.isPrimary
    });
    setBankErrors({});
    setBankModalVisible(true);
  };

  // Set Bank as Primary
  const handleSetPrimaryBank = async (b: InvestorBank) => {
    try {
      await repository.updateBankDetails(b.bankId, { isPrimary: true });
      loadProfileData();
      Alert.alert('Primary Bank Updated', `${b.bankName} (${b.accountNumberMasked}) is now set as primary disbursement account.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update primary bank');
    }
  };

  // Save Bank Details (Create or Edit)
  const handleSaveBank = async () => {
    const errs: Record<string, string> = {};
    if (!bankForm.accountHolderName.trim()) errs.accountHolderName = 'Beneficiary name is required';
    if (!bankForm.bankName.trim()) errs.bankName = 'Bank name is required';
    if (!bankForm.accountNumber.trim()) errs.accountNumber = 'Account number is required';
    if (!bankForm.ifscCode.trim()) errs.ifscCode = 'IFSC code is required';

    if (Object.keys(errs).length > 0) {
      setBankErrors(errs);
      return;
    }

    setBankEditLoading(true);
    try {
      if (selectedBank) {
        // Edit existing bank
        await repository.updateBankDetails(selectedBank.bankId, {
          accountHolderName: bankForm.accountHolderName.trim(),
          bankName: bankForm.bankName.trim(),
          accountNumberMasked: maskBankAccount(bankForm.accountNumber.trim()),
          ifscCode: bankForm.ifscCode.trim().toUpperCase(),
          accountType: bankForm.accountType,
          isPrimary: bankForm.isPrimary
        });
        Alert.alert('Bank Updated', `Bank details for ${bankForm.bankName} updated.`);
      } else {
        // Add new bank
        await repository.addBankDetails({
          investorId,
          accountHolderName: bankForm.accountHolderName.trim(),
          bankName: bankForm.bankName.trim(),
          accountNumberMasked: maskBankAccount(bankForm.accountNumber.trim()),
          ifscCode: bankForm.ifscCode.trim().toUpperCase(),
          accountType: bankForm.accountType,
          isPrimary: bankForm.isPrimary
        });
        Alert.alert('Bank Added', `New bank account added for ${investor?.name}.`);
      }
      setBankModalVisible(false);
      loadProfileData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save bank details');
    } finally {
      setBankEditLoading(false);
    }
  };

  // Open Add Document Modal
  const handleOpenAddDoc = () => {
    setSelectedDoc(null);
    setDocForm({
      documentName: '',
      documentType: 'Agreement',
      driveUrl: '',
      expiryDate: '',
      status: 'Valid'
    });
    setDocErrors({});
    setDocModalVisible(true);
  };

  // Open Edit Document Modal
  const handleOpenEditDoc = (d: InvestorDocument) => {
    setSelectedDoc(d);
    setDocForm({
      documentName: d.documentName,
      documentType: d.documentType,
      driveUrl: d.driveUrl || '',
      expiryDate: d.expiryDate || '',
      status: d.status
    });
    setDocErrors({});
    setDocModalVisible(true);
  };

  // Save Document (Create or Edit)
  const handleSaveDoc = async () => {
    if (!docForm.documentName.trim()) {
      setDocErrors({ documentName: 'Document title is required' });
      return;
    }

    setDocEditLoading(true);
    try {
      if (selectedDoc) {
        // Edit existing document
        await repository.updateInvestorDocument(selectedDoc.documentId, {
          documentName: docForm.documentName.trim(),
          documentType: docForm.documentType,
          driveUrl: docForm.driveUrl.trim() || undefined,
          expiryDate: docForm.expiryDate.trim() || undefined,
          status: docForm.status
        });
        Alert.alert('Document Updated', `Document "${docForm.documentName}" updated successfully.`);
      } else {
        // Add new document
        await repository.addInvestorDocument({
          entityType: 'Investor',
          entityId: investorId,
          documentName: docForm.documentName.trim(),
          documentType: docForm.documentType,
          driveUrl: docForm.driveUrl.trim() || undefined,
          uploadedDate: new Date().toISOString().split('T')[0],
          expiryDate: docForm.expiryDate.trim() || undefined,
          status: docForm.status,
          createdBy: user?.userId || 'USR-00001'
        });
        Alert.alert('Document Cataloged', `New document attached to ${investor?.name}.`);
      }
      setDocModalVisible(false);
      loadProfileData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save document');
    } finally {
      setDocEditLoading(false);
    }
  };

  // Open Document URL
  const handleOpenDocUrl = (url?: string) => {
    if (!url) {
      Alert.alert('Notice', 'No Google Drive link attached to this document.');
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open document link.');
    });
  };

  // Launch device phone dialer
  const handleCallPhone = (phone?: string) => {
    if (!phone || !phone.trim()) {
      Alert.alert('Notice', 'No contact phone number available.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    const phoneUrl = `tel:${cleanPhone}`;
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert('Error', 'Unable to open the phone dialer on this device.');
    });
  };

  // Launch email client
  const handleSendEmail = (email?: string) => {
    if (!email || !email.trim()) {
      Alert.alert('Notice', 'No email address available.');
      return;
    }
    const emailUrl = `mailto:${email.trim()}`;
    Linking.openURL(emailUrl).catch(() => {
      Alert.alert('Error', 'Unable to open email client on this device.');
    });
  };

  // Handle Mark Payment as Paid
  const handleMarkPaymentPaid = async () => {
    if (!confirmPaymentModal.payment) return;
    const payment = confirmPaymentModal.payment;
    try {
      const requestId = 'REQ-PAY-' + Date.now();
      await repository.updatePaymentStatus(payment.paymentId, 'Paid', `UTR-${Date.now()}`, requestId);
      setConfirmPaymentModal({ visible: false, payment: null });
      loadProfileData();
      Alert.alert('Success', `Payment ${payment.paymentId} marked as PAID.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update payment status');
    }
  };

  // Handle Payment Reversal
  const handleExecuteReversal = async () => {
    if (!reverseModal.payment || !reverseModal.reason.trim()) {
      Alert.alert('Required', 'Please enter a justification reason for reversal.');
      return;
    }
    const payment = reverseModal.payment;
    try {
      const requestId = 'REQ-REV-' + Date.now();
      await repository.reversePayment(payment.paymentId, reverseModal.reason.trim(), requestId);
      setReverseModal({ visible: false, payment: null, reason: '' });
      loadProfileData();
      Alert.alert('Reversed', `Payment ${payment.paymentId} has been reversed.`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reverse payment');
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Loading investor portfolio..." />;
  }

  if (!investor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Investor Profile" user={user} />
        <EmptyState
          icon="⚠️"
          title="Investor Not Found"
          message="Could not locate record for the requested investor ID."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={investor.name}
        subtitle={`${investor.investorId} • Onboarded ${formatDate(investor.joiningDate)}`}
        user={user}
        rightAction={
          user?.role !== 'Staff' ? (
            <Button
              title="✏️ Edit"
              size="sm"
              variant="outline"
              onPress={handleOpenEdit}
            />
          ) : undefined
        }
      />

      {/* Tabs Header */}
      <View style={styles.tabsHeader}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'investments', label: `Tranches (${investments.length})` },
            { key: 'payments', label: `Payments (${payments.length})` },
            { key: 'bank', label: `Banks (${banks.length})` },
            { key: 'documents', label: `Docs (${documents.length})` }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabPill,
                activeTab === tab.key && styles.tabPillActive
              ]}
              onPress={() => setActiveTab(tab.key as TabKey)}
            >
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === tab.key && styles.tabPillTextActive
                ]}
              >
                {tab.label}
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
              loadProfileData();
            }}
            tintColor={THEME.colors.accent.indigo}
          />
        }
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Status & Profile Header Card */}
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <View>
                  <Text style={styles.profileName}>{investor.name}</Text>
                  <Text style={styles.profileId}>{investor.investorId}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={investor.status} />
                  {user?.role !== 'Staff' && (
                    <TouchableOpacity
                      style={styles.inlineEditBtn}
                      onPress={handleOpenEdit}
                    >
                      <Text style={styles.inlineEditBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.contactGrid}>
                <TouchableOpacity style={styles.contactItem} onPress={() => handleCallPhone(investor.phone)} activeOpacity={0.7}>
                  <Text style={styles.contactLabel}>Phone Number</Text>
                  <Text style={[styles.contactValue, { color: THEME.colors.accent.indigo }]}>📞 {investor.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactItem} onPress={() => handleSendEmail(investor.email)} activeOpacity={0.7}>
                  <Text style={styles.contactLabel}>Email Address</Text>
                  <Text style={[styles.contactValue, investor.email ? { color: THEME.colors.accent.indigo } : undefined]}>
                    {investor.email ? `✉️ ${investor.email}` : '—'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Address</Text>
                  <Text style={styles.contactValue}>{investor.address || '—'}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Investor Type</Text>
                  <Text style={styles.contactValue}>{investor.notes || 'HNI Account'}</Text>
                </View>
              </View>
            </View>

            {/* Financial Positions */}
            <Text style={styles.sectionHeader}>CAPITAL & RETURNS POSITION</Text>
            <View style={styles.kpiGrid}>
              <KpiCard
                label="Total Invested"
                value={totalPrincipal}
                compact
                accentColor={THEME.colors.accent.cyan}
                deltaText={`${investments.length} Active Tranches`}
              />
              <KpiCard
                label="Principal Outstanding"
                value={outstandingPrincipal}
                compact
                accentColor={THEME.colors.accent.indigo}
                deltaText="Unreturned Balance"
              />
            </View>

            <View style={styles.kpiGrid}>
              <KpiCard
                label="Total Profit Paid"
                value={totalProfitPaid}
                compact
                accentColor={THEME.colors.accent.emerald}
                deltaText="Cumulative Realized"
              />
              <KpiCard
                label="Monthly Expected Return"
                value={currentMonthlyReturnExpected}
                compact
                accentColor={THEME.colors.accent.amber}
                deltaText={`${totalPrincipal > 0 ? ((currentMonthlyReturnExpected / totalPrincipal) * 100).toFixed(2) : '0.00'}% p.m. Effective`}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsBox}>
              <Button
                title="+ New Investment Tranche"
                onPress={() => navigation.navigate('AddInvestment', { investorId })}
                style={{ flex: 1 }}
              />
              <Button
                title="💳 Record Payment"
                variant="secondary"
                onPress={() => navigation.navigate('RecordPayment', { investorId })}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {/* TAB 2: INVESTMENTS / TRANCHES */}
        {activeTab === 'investments' && (
          <View style={styles.tabContent}>
            <View style={styles.tabActionsHeader}>
              <Text style={styles.tabCountText}>{investments.length} Active Tranches</Text>
              <Button
                title="+ Add Tranche"
                size="sm"
                onPress={() => navigation.navigate('AddInvestment', { investorId })}
              />
            </View>

            {investments.length === 0 ? (
              <EmptyState
                icon="💰"
                title="No Investment Tranches"
                message="Add the first capital investment tranche to start calculating monthly returns."
                actionLabel="+ Add Tranche"
                onAction={() => navigation.navigate('AddInvestment', { investorId })}
              />
            ) : (
              investments.map(inv => (
                <View key={inv.investmentId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>{inv.investmentId}</Text>
                      <Text style={styles.cardSub}>
                        Deposited: {formatDate(inv.investmentDate)} • Maturity: {formatDate(inv.maturityDate)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <StatusBadge status={inv.status} size="sm" />
                      {user?.role !== 'Staff' && (
                        <TouchableOpacity
                          style={styles.inlineEditBtn}
                          onPress={() => handleOpenEditTranche(inv)}
                        >
                          <Text style={styles.inlineEditBtnText}>✏️ Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.trancheMetrics}>
                    <View style={styles.trancheMetricItem}>
                      <Text style={styles.metricLabel}>Principal</Text>
                      <Text style={styles.metricValueBold}>{formatCurrency(inv.principalAmount)}</Text>
                    </View>
                    <View style={styles.trancheMetricItem}>
                      <Text style={styles.metricLabel}>Return Rate</Text>
                      <Text style={[styles.metricValueBold, { color: THEME.colors.accent.indigo }]}>
                        {inv.returnPercentage}% / mo
                      </Text>
                    </View>
                    <View style={styles.trancheMetricItem}>
                      <Text style={styles.metricLabel}>Monthly Payout</Text>
                      <Text style={[styles.metricValueBold, { color: THEME.colors.accent.emerald }]}>
                        {formatCurrency(inv.monthlyReturn)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.trancheFooter}>
                    <Text style={styles.footerNote}>Frequency: {inv.paymentFrequency}</Text>
                    {inv.notes ? <Text style={styles.footerNote}>{inv.notes}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: PAYMENTS & HISTORY */}
        {activeTab === 'payments' && (
          <View style={styles.tabContent}>
            <View style={styles.tabActionsHeader}>
              <Text style={styles.tabCountText}>{payments.length} Payment Disbursements</Text>
              <Button
                title="+ Record Payment"
                size="sm"
                onPress={() => navigation.navigate('RecordPayment', { investorId })}
              />
            </View>

            {payments.length === 0 ? (
              <EmptyState
                icon="💳"
                title="No Payment Records"
                message="No payment transactions recorded for this investor."
                actionLabel="+ Record Payment"
                onAction={() => navigation.navigate('RecordPayment', { investorId })}
              />
            ) : (
              payments.map(pay => {
                const isPaid = pay.status === 'Paid';
                const isReversed = pay.status === 'Reversed';

                return (
                  <View key={pay.paymentId} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardTitle}>{pay.paymentId}</Text>
                        <Text style={styles.cardSub}>
                          Period: {pay.paymentMonth} • Date: {formatDate(pay.paymentDate)}
                        </Text>
                      </View>
                      <StatusBadge status={pay.status} size="sm" />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.paymentBreakdown}>
                      <View style={styles.payRow}>
                        <Text style={styles.payLabel}>Profit Amount:</Text>
                        <Text style={styles.payValBold}>{formatCurrency(pay.profitAmount)}</Text>
                      </View>
                      {pay.principalAmount ? (
                        <View style={styles.payRow}>
                          <Text style={styles.payLabel}>Principal Repaid:</Text>
                          <Text style={styles.payValBold}>{formatCurrency(pay.principalAmount)}</Text>
                        </View>
                      ) : null}
                      {pay.otherAmount ? (
                        <View style={styles.payRow}>
                          <Text style={styles.payLabel}>Other Adjustments:</Text>
                          <Text style={styles.payValBold}>
                            {formatCurrency(pay.otherAmount)}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.totalPayRow}>
                        <Text style={styles.totalPayLabel}>Total Disbursed:</Text>
                        <Text style={styles.totalPayValue}>{formatCurrency(pay.totalAmount)}</Text>
                      </View>
                    </View>

                    {pay.paymentReference ? (
                      <View style={styles.refBox}>
                        <Text style={styles.refText}>UTR Reference: {pay.paymentReference}</Text>
                      </View>
                    ) : null}

                    {/* Action Bar for Payments */}
                    {user?.role !== 'Staff' && !isReversed && (
                      <View style={styles.payActionsRow}>
                        {!isPaid && (
                          <Button
                            title="✓ Mark as Paid"
                            size="sm"
                            variant="primary"
                            onPress={() => setConfirmPaymentModal({ visible: true, payment: pay })}
                            style={{ flex: 1 }}
                          />
                        )}
                        <Button
                          title="↩ Reverse"
                          size="sm"
                          variant="danger"
                          onPress={() => setReverseModal({ visible: true, payment: pay, reason: '' })}
                          style={{ flex: 1 }}
                        />
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 4: BANK DETAILS (MULTIPLE ACCOUNTS) */}
        {activeTab === 'bank' && (
          <View style={styles.tabContent}>
            <View style={styles.tabActionsHeader}>
              <Text style={styles.tabCountText}>{banks.length} Linked Bank Accounts</Text>
              {user?.role !== 'Staff' && (
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
                title="No Bank Details Attached"
                message="Attach a bank account to enable seamless profit and principal payouts."
                actionLabel="+ Add Bank"
                onAction={handleOpenAddBank}
              />
            ) : (
              banks.map(b => (
                <View key={b.bankId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>{b.bankName}</Text>
                      <Text style={styles.cardSub}>Account Type: {b.accountType}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <StatusBadge status={b.isPrimary ? 'Active' : 'Inactive'} size="sm" />
                      {user?.role !== 'Staff' && (
                        <TouchableOpacity
                          style={styles.inlineEditBtn}
                          onPress={() => handleOpenEditBank(b)}
                        >
                          <Text style={styles.inlineEditBtnText}>✏️ Edit</Text>
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
                      <Text style={styles.contactValue}>
                        {b.accountNumberMasked}
                      </Text>
                    </View>
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>IFSC Code</Text>
                      <Text style={styles.contactValue}>{b.ifscCode}</Text>
                    </View>
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Account Role</Text>
                      <Text style={[styles.contactValue, b.isPrimary && { color: THEME.colors.accent.emerald, fontWeight: '700' }]}>
                        {b.isPrimary ? '⭐ Primary Payout Account' : 'Secondary Account'}
                      </Text>
                    </View>
                  </View>

                  {!b.isPrimary && user?.role !== 'Staff' && (
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

        {/* TAB 5: DOCUMENTS (AGREEMENTS & KYC) */}
        {activeTab === 'documents' && (
          <View style={styles.tabContent}>
            <View style={styles.tabActionsHeader}>
              <Text style={styles.tabCountText}>{documents.length} KYC & Agreement Files</Text>
              {user?.role !== 'Staff' && (
                <Button
                  title="+ Add Document"
                  size="sm"
                  onPress={handleOpenAddDoc}
                />
              )}
            </View>

            {documents.length === 0 ? (
              <EmptyState
                icon="📁"
                title="No Documents Attached"
                message="Agreements, KYC cards, and signed mandates on Google Drive will be cataloged here."
                actionLabel="+ Add Document"
                onAction={handleOpenAddDoc}
              />
            ) : (
              documents.map(doc => (
                <View key={doc.documentId} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{doc.documentName}</Text>
                      <Text style={styles.cardSub}>
                        Type: {doc.documentType} • Uploaded: {formatDate(doc.uploadedDate)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <StatusBadge status={doc.status} size="sm" />
                      {user?.role !== 'Staff' && (
                        <TouchableOpacity
                          style={styles.inlineEditBtn}
                          onPress={() => handleOpenEditDoc(doc)}
                        >
                          <Text style={styles.inlineEditBtnText}>✏️ Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.contactGrid}>
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Category</Text>
                      <Text style={styles.contactValue}>{doc.documentType.replace('_', ' ')}</Text>
                    </View>
                    {doc.expiryDate ? (
                      <View style={styles.contactItem}>
                        <Text style={styles.contactLabel}>Validity Expiry</Text>
                        <Text style={styles.contactValue}>{formatDate(doc.expiryDate)}</Text>
                      </View>
                    ) : null}
                    <View style={styles.contactItem}>
                      <Text style={styles.contactLabel}>Document Status</Text>
                      <Text style={[styles.contactValue, { color: doc.status === 'Valid' ? THEME.colors.accent.emerald : THEME.colors.accent.amber, fontWeight: '700' }]}>
                        {doc.status}
                      </Text>
                    </View>
                  </View>

                  {doc.driveUrl ? (
                    <TouchableOpacity
                      style={styles.viewDocLinkBtn}
                      onPress={() => handleOpenDocUrl(doc.driveUrl)}
                    >
                      <Text style={styles.viewDocLinkText}>🔗 Open Google Drive Document ›</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* EDIT INVESTOR PROFILE MODAL */}
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
              <Text style={styles.editModalTitle}>Edit Investor Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              <Input
                label="Full Legal Name *"
                value={editForm.name}
                onChangeText={text => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder="e.g. Ramesh Chandra Verma"
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
                label="Email Address"
                value={editForm.email}
                onChangeText={text => setEditForm(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="investor@example.com"
                error={editErrors.email}
              />

              <Input
                label="Residential / Office Address"
                value={editForm.address}
                onChangeText={text => setEditForm(prev => ({ ...prev, address: text }))}
                placeholder="e.g. Bandra West, Mumbai"
              />

              <Text style={styles.inputLabel}>Account Status</Text>
              <View style={styles.statusPillsRow}>
                {(['Active', 'Inactive', 'Suspended'] as const).map(st => (
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
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Investor Category / Notes"
                value={editForm.notes}
                onChangeText={text => setEditForm(prev => ({ ...prev, notes: text }))}
                placeholder="e.g. Family Office, HNI, Direct Referral"
              />

              <View style={styles.editModalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Changes"
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

      {/* EDIT INVESTMENT TRANCHE MODAL */}
      <Modal
        visible={editTrancheModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditTrancheModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.editModalTitle}>Edit Investment Tranche</Text>
                <Text style={styles.editModalSub}>{selectedTranche?.investmentId}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditTrancheModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              {/* Real-time Recalculated Return Banner */}
              <View style={styles.trancheBannerBox}>
                <Text style={styles.trancheBannerLabel}>UPDATED MONTHLY PAYOUT</Text>
                <Text style={styles.trancheBannerValue}>{formatCurrency(liveTrancheMonthlyPayout)}</Text>
                <Text style={styles.trancheBannerSub}>
                  {trancheForm.returnPercentage}% / month on {formatCurrency(trancheForm.principalAmount)}
                </Text>
              </View>

              <CurrencyInput
                label="Principal Capital Amount (₹) *"
                value={trancheForm.principalAmount}
                onChangeValue={val => setTrancheForm(prev => ({ ...prev, principalAmount: val }))}
              />

              <PercentageInput
                label="Agreed Monthly Return Rate (% / month) *"
                value={trancheForm.returnPercentage}
                onChangeValue={val => setTrancheForm(prev => ({ ...prev, returnPercentage: val }))}
              />

              <Text style={styles.inputLabel}>Payment Frequency</Text>
              <View style={styles.statusPillsRow}>
                {(['Monthly', 'Quarterly', 'Annual', 'On_Maturity'] as const).map(freq => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.statusPill,
                      trancheForm.paymentFrequency === freq && styles.statusPillActive
                    ]}
                    onPress={() => setTrancheForm(prev => ({ ...prev, paymentFrequency: freq }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        trancheForm.paymentFrequency === freq && styles.statusPillTextActive
                      ]}
                    >
                      {freq === 'On_Maturity' ? 'Maturity' : freq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Tranche Status</Text>
              <View style={styles.statusPillsRow}>
                {(['Active', 'Matured', 'Closed', 'Suspended'] as const).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPill,
                      trancheForm.status === st && styles.statusPillActive
                    ]}
                    onPress={() => setTrancheForm(prev => ({ ...prev, status: st }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        trancheForm.status === st && styles.statusPillTextActive
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Maturity Date (YYYY-MM-DD)"
                value={trancheForm.maturityDate}
                onChangeText={text => setTrancheForm(prev => ({ ...prev, maturityDate: text }))}
                placeholder="2027-09-02"
              />

              <Input
                label="Tranche Notes / Policy Ref"
                value={trancheForm.notes}
                onChangeText={text => setTrancheForm(prev => ({ ...prev, notes: text }))}
                placeholder="e.g. Additional allocation, rollover tranche"
              />

              <View style={styles.editModalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setEditTrancheModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Save Tranche Changes"
                  variant="primary"
                  loading={trancheEditLoading}
                  onPress={handleSaveEditTranche}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDIT / ADD BANK DETAILS MODAL */}
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
                  {selectedBank ? 'Edit Bank Account' : 'Add Bank Account'}
                </Text>
                <Text style={styles.editModalSub}>
                  {selectedBank ? selectedBank.bankId : `Investor: ${investor?.name}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBankModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              <Input
                label="Beneficiary Account Holder Name *"
                value={bankForm.accountHolderName}
                onChangeText={text => setBankForm(prev => ({ ...prev, accountHolderName: text }))}
                placeholder="e.g. Ramesh Chandra Verma"
                error={bankErrors.accountHolderName}
              />

              <Input
                label="Bank Name *"
                value={bankForm.bankName}
                onChangeText={text => setBankForm(prev => ({ ...prev, bankName: text }))}
                placeholder="e.g. HDFC Bank, ICICI Bank, Axis Bank"
                error={bankErrors.bankName}
              />

              <Input
                label="Bank Account Number *"
                value={bankForm.accountNumber}
                onChangeText={text => setBankForm(prev => ({ ...prev, accountNumber: text }))}
                placeholder="e.g. 50100234564582"
                keyboardType="number-pad"
                error={bankErrors.accountNumber}
              />

              <Input
                label="IFSC Code *"
                value={bankForm.ifscCode}
                onChangeText={text => setBankForm(prev => ({ ...prev, ifscCode: text.toUpperCase() }))}
                placeholder="e.g. HDFC0001234"
                autoCapitalize="characters"
                error={bankErrors.ifscCode}
              />

              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.statusPillsRow}>
                {(['Savings', 'Current'] as const).map(type => (
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
                      {type} Account
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryToggleCard,
                  bankForm.isPrimary && styles.primaryToggleCardActive
                ]}
                onPress={() => setBankForm(prev => ({ ...prev, isPrimary: !prev.isPrimary }))}
              >
                <Text style={styles.primaryToggleIcon}>{bankForm.isPrimary ? '⭐' : '☆'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.primaryToggleTitle}>Primary Disbursement Account</Text>
                  <Text style={styles.primaryToggleSub}>
                    Default account for automated monthly profit distributions
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.editModalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setBankModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={selectedBank ? 'Save Bank Changes' : 'Attach Bank Account'}
                  variant="primary"
                  loading={bankEditLoading}
                  onPress={handleSaveBank}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDIT / ADD DOCUMENT MODAL */}
      <Modal
        visible={docModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDocModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editModalContainer}>
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.editModalTitle}>
                  {selectedDoc ? 'Edit KYC / Document' : 'Attach New Document'}
                </Text>
                <Text style={styles.editModalSub}>
                  {selectedDoc ? selectedDoc.documentId : `Investor: ${investor?.name}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDocModalVisible(false)}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              <Input
                label="Document Title / File Name *"
                value={docForm.documentName}
                onChangeText={text => setDocForm(prev => ({ ...prev, documentName: text }))}
                placeholder="e.g. Master Capital Agreement 2026"
                error={docErrors.documentName}
              />

              <Text style={styles.inputLabel}>Document Classification Type</Text>
              <View style={styles.docTypeGrid}>
                {(['Agreement', 'KYC', 'Bank_Proof', 'Policy', 'Investment_Doc', 'Other'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.docTypePill,
                      docForm.documentType === type && styles.statusPillActive
                    ]}
                    onPress={() => setDocForm(prev => ({ ...prev, documentType: type }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        docForm.documentType === type && styles.statusPillTextActive
                      ]}
                    >
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Google Drive Link / URL"
                value={docForm.driveUrl}
                onChangeText={text => setDocForm(prev => ({ ...prev, driveUrl: text }))}
                placeholder="https://drive.google.com/file/d/..."
              />

              <Input
                label="Expiry / Renewal Date (Optional)"
                value={docForm.expiryDate}
                onChangeText={text => setDocForm(prev => ({ ...prev, expiryDate: text }))}
                placeholder="YYYY-MM-DD (e.g. 2028-09-02)"
              />

              <Text style={styles.inputLabel}>Document Status</Text>
              <View style={styles.statusPillsRow}>
                {(['Valid', 'Expiring', 'Expired', 'Revoked'] as const).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPill,
                      docForm.status === st && styles.statusPillActive
                    ]}
                    onPress={() => setDocForm(prev => ({ ...prev, status: st }))}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        docForm.status === st && styles.statusPillTextActive
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.editModalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setDocModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={selectedDoc ? 'Save Document Changes' : 'Catalog Document'}
                  variant="primary"
                  loading={docEditLoading}
                  onPress={handleSaveDoc}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirmation Modal for Marking Paid */}
      <ConfirmationDialog
        visible={confirmPaymentModal.visible}
        title="Disburse Investor Payment"
        message="Are you sure you want to mark this payment transaction as PAID? This will update the investor balance."
        amount={confirmPaymentModal.payment?.totalAmount}
        recipientOrEntity={investor.name}
        confirmLabel="Confirm Payment Paid"
        variant="success"
        onConfirm={handleMarkPaymentPaid}
        onCancel={() => setConfirmPaymentModal({ visible: false, payment: null })}
      />

      {/* Reversal Modal with Mandatory Justification Reason */}
      <Modal
        visible={reverseModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setReverseModal({ visible: false, payment: null, reason: '' })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reversalDialog}>
            <Text style={styles.reversalTitle}>Reverse Financial Payment</Text>
            <Text style={styles.reversalSubtitle}>
              Reversals create an explicit compensating negative entry in the ledger and generate an immutable audit log.
            </Text>

            <View style={styles.reversalAmountBox}>
              <Text style={styles.reversalAmountLabel}>Reversal Amount:</Text>
              <Text style={styles.reversalAmountValue}>
                {formatCurrency(reverseModal.payment?.totalAmount || 0)}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Mandatory Reversal Justification Reason:</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Incorrect bank account credited, duplicate batch run"
              placeholderTextColor={THEME.colors.text.muted}
              value={reverseModal.reason}
              onChangeText={text => setReverseModal(prev => ({ ...prev, reason: text }))}
              multiline
              numberOfLines={3}
            />

            <View style={styles.reversalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                size="md"
                onPress={() => setReverseModal({ visible: false, payment: null, reason: '' })}
                style={{ flex: 1 }}
              />
              <Button
                title="Confirm Reversal"
                variant="danger"
                size="md"
                onPress={handleExecuteReversal}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  tabsHeader: {
    backgroundColor: THEME.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.border,
    paddingVertical: 8
  },
  tabsScroll: {
    paddingHorizontal: THEME.spacing.md,
    gap: 8
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background.cardElevated,
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
    fontWeight: '700'
  },
  tabPillTextActive: {
    color: '#FFF'
  },
  tabContent: {
    gap: THEME.spacing.md
  },
  profileCard: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  profileName: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  profileId: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  inlineEditBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  inlineEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.background.divider,
    marginVertical: THEME.spacing.md
  },
  contactGrid: {
    gap: 8
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  contactLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted
  },
  contactValue: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.text.primary
  },
  sectionHeader: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8,
    marginTop: 4
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: THEME.spacing.sm
  },
  actionsBox: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
    marginTop: 4
  },
  tabActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  tabCountText: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '700',
    color: THEME.colors.text.secondary
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
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  cardSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  trancheMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  trancheMetricItem: {
    alignItems: 'center'
  },
  metricLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  metricValueBold: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginTop: 2
  },
  trancheFooter: {
    marginTop: THEME.spacing.sm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  footerNote: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  paymentBreakdown: {
    gap: 6
  },
  payRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  payLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
  },
  payValBold: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600',
    color: THEME.colors.text.primary
  },
  totalPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider,
    marginTop: 2
  },
  totalPayLabel: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  totalPayValue: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.accent.emerald
  },
  refBox: {
    backgroundColor: THEME.colors.background.cardElevated,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    marginTop: 8
  },
  refText: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  payActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10
  },
  setPrimaryBtn: {
    marginTop: 10,
    paddingVertical: 8,
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.accent.emerald,
    alignItems: 'center'
  },
  setPrimaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.emerald
  },
  viewDocLinkBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.accent.indigo,
    alignItems: 'center'
  },
  viewDocLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.indigo
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
  trancheBannerBox: {
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  trancheBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8
  },
  trancheBannerValue: {
    fontSize: THEME.typography.fontSize.xxl,
    fontWeight: '800',
    color: THEME.colors.accent.emerald,
    marginVertical: 2
  },
  trancheBannerSub: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary
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
  docTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  docTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  primaryToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    marginVertical: 6
  },
  primaryToggleCardActive: {
    borderColor: THEME.colors.accent.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.08)'
  },
  primaryToggleIcon: {
    fontSize: 20
  },
  primaryToggleTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  primaryToggleSub: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  editModalActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.md
  },
  reversalDialog: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  reversalTitle: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '800',
    color: THEME.colors.accent.rose,
    marginBottom: 4
  },
  reversalSubtitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    lineHeight: 18,
    marginBottom: THEME.spacing.md
  },
  reversalAmountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.background.cardElevated,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md
  },
  reversalAmountLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted
  },
  reversalAmountValue: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.accent.rose
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginBottom: 6
  },
  reasonInput: {
    backgroundColor: THEME.colors.background.input,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    padding: THEME.spacing.md,
    color: THEME.colors.text.primary,
    fontSize: THEME.typography.fontSize.sm,
    textAlignVertical: 'top',
    height: 80,
    marginBottom: THEME.spacing.lg
  },
  reversalActions: {
    flexDirection: 'row',
    gap: THEME.spacing.md
  }
});
