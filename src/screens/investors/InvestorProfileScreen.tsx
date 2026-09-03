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
  Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { KpiCard } from '../../components/common/KpiCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import {
  Investor,
  InvestorBank,
  Investment,
  InvestorPayment,
  InvestorDocument
} from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { maskBankAccount } from '../../utils/masking';
import {
  calculateOutstandingPrincipal,
  calculateInvestorProfitPaid
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

  // Unmasked bank account view for Admin
  const [showUnmaskedBank, setShowUnmaskedBank] = useState(false);

  const loadProfileData = useCallback(async () => {
    try {
      const details = await repository.getInvestorDetails(investorId);
      setInvestor(details.investor);
      setBank(details.bank || null);
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

  // Open Edit Modal
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

  // Save Edit Changes
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
            { key: 'bank', label: 'Bank Details' },
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
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Phone Number</Text>
                  <Text style={styles.contactValue}>{investor.phone}</Text>
                </View>
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Email Address</Text>
                  <Text style={styles.contactValue}>{investor.email || '—'}</Text>
                </View>
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
                    <StatusBadge status={inv.status} size="sm" />
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

        {/* TAB 4: BANK DETAILS */}
        {activeTab === 'bank' && (
          <View style={styles.tabContent}>
            {bank ? (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{bank.bankName}</Text>
                    <Text style={styles.cardSub}>Account Type: {bank.accountType}</Text>
                  </View>
                  <StatusBadge status={bank.isPrimary ? 'Active' : 'Inactive'} size="sm" />
                </View>

                <View style={styles.divider} />

                <View style={styles.contactGrid}>
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Beneficiary Name</Text>
                    <Text style={styles.contactValue}>{bank.accountHolderName}</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Account Number</Text>
                    <Text style={styles.contactValue}>
                      {bank.accountNumberMasked}
                    </Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>IFSC Code</Text>
                    <Text style={styles.contactValue}>{bank.ifscCode}</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Text style={styles.contactLabel}>Account Type</Text>
                    <Text style={styles.contactValue}>{bank.accountType}</Text>
                  </View>
                </View>

                {/* Admin Unmask Button */}
                {user?.role === 'Admin' ? (
                  <TouchableOpacity
                    style={styles.unmaskToggle}
                    onPress={() => setShowUnmaskedBank(!showUnmaskedBank)}
                  >
                    <Text style={styles.unmaskToggleText}>
                      {showUnmaskedBank ? '🔒 Hide Sensitive Account Number' : '👁️ Reveal Full Account Number (Admin)'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <EmptyState
                icon="🏦"
                title="No Bank Details Attached"
                message="Attach a bank account to enable seamless profit and principal payouts."
                actionLabel="+ Add Bank"
                onAction={() => navigation.navigate('AddBankDetails', { investorId })}
              />
            )}
          </View>
        )}

        {/* TAB 5: DOCUMENTS */}
        {activeTab === 'documents' && (
          <View style={styles.tabContent}>
            <View style={styles.tabActionsHeader}>
              <Text style={styles.tabCountText}>{documents.length} KYC & Agreement Files</Text>
            </View>

            {documents.length === 0 ? (
              <EmptyState
                icon="📁"
                title="No Documents Attached"
                message="Agreements, KYC cards, and signed mandates on Google Drive will be cataloged here."
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
                    <StatusBadge status={doc.status} size="sm" />
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* EDIT INVESTOR MODAL */}
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
  unmaskToggle: {
    marginTop: THEME.spacing.md,
    padding: THEME.spacing.sm,
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center'
  },
  unmaskToggleText: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '600',
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
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  statusPillTextActive: {
    color: '#FFF',
    fontWeight: '800'
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
