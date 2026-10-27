import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { SearchBar } from '../../components/common/SearchBar';
import { LoadingState } from '../../components/common/LoadingState';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuth } from '../../store/AuthContext';
import { InvestorPaymentReminderItem, PaymentDueStatus } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatPhoneNumber, formatPhoneForWhatsApp } from '../../utils/phone';
import { getCurrentMonthPeriod, formatDate } from '../../utils/date';

export const PaymentRemindersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, repository } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState<string>(
    route.params?.month || getCurrentMonthPeriod()
  );
  const [reminders, setReminders] = useState<InvestorPaymentReminderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadReminders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const items = await repository.getPaymentReminders(selectedMonth);
      setReminders(items || []);
    } catch (e: any) {
      console.warn('Failed to load payment reminders:', e);
      Alert.alert('Error', e?.message || 'Failed to fetch payment reminders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repository, selectedMonth]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Navigate months
  const handleMonthChange = (direction: -1 | 1) => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + direction;

    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }

    const nextMonthStr = `${year}-${('0' + month).slice(-2)}`;
    setSelectedMonth(nextMonthStr);
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    let overdueCount = 0;
    let overdueAmount = 0;
    let dueTodayCount = 0;
    let dueTodayAmount = 0;
    let upcomingCount = 0;
    let upcomingAmount = 0;
    let paidCount = 0;
    let paidAmount = 0;
    let totalExpected = 0;

    reminders.forEach(r => {
      totalExpected += r.monthlyReturnExpected || 0;
      if (r.status === 'Overdue') {
        overdueCount++;
        overdueAmount += r.monthlyReturnExpected || 0;
      } else if (r.status === 'Due_Today') {
        dueTodayCount++;
        dueTodayAmount += r.monthlyReturnExpected || 0;
      } else if (r.status === 'Upcoming') {
        upcomingCount++;
        upcomingAmount += r.monthlyReturnExpected || 0;
      } else if (r.status === 'Paid') {
        paidCount++;
        paidAmount += r.paidAmount || r.monthlyReturnExpected || 0;
      }
    });

    return {
      totalExpected,
      overdueCount,
      overdueAmount,
      dueTodayCount,
      dueTodayAmount,
      upcomingCount,
      upcomingAmount,
      paidCount,
      paidAmount,
      totalPendingCount: overdueCount + dueTodayCount + upcomingCount
    };
  }, [reminders]);

  // Filtered List
  const filteredReminders = useMemo(() => {
    let list = [...reminders];

    if (statusFilter !== 'All') {
      if (statusFilter === 'Due_Or_Overdue') {
        list = list.filter(r => r.status === 'Overdue' || r.status === 'Due_Today');
      } else {
        list = list.filter(r => r.status === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.investorName.toLowerCase().includes(q) ||
          r.investorId.toLowerCase().includes(q) ||
          r.investmentId.toLowerCase().includes(q) ||
          (r.investorPhone && r.investorPhone.includes(q))
      );
    }

    return list;
  }, [reminders, statusFilter, searchQuery]);

  // Pre-fill and Navigate to Record Payment Screen
  const handlePayNow = (item: InvestorPaymentReminderItem) => {
    navigation.navigate('RecordPayment', {
      investorId: item.investorId,
      investmentId: item.investmentId
    });
  };

  // Dispatch Professional Courtesy WhatsApp Message to Investor
  const handleSendWhatsAppUpdate = async (item: InvestorPaymentReminderItem) => {
    const cleanPhone = formatPhoneForWhatsApp(item.investorPhone);
    const amountFormatted = formatCurrency(item.monthlyReturnExpected);
    const principalFormatted = formatCurrency(item.principalAmount);

    let message = `*MONTHLY DISBURSEMENT UPDATE*\n`;
    message += `*VANTARA TRADING COMPANY*\n`;
    message += `-----------------------------------------\n`;
    message += `Dear *${item.investorName}*,\n\n`;
    message += `This is a courtesy intimation regarding your scheduled monthly return payout for *${selectedMonth}*.\n\n`;
    message += `*Investment Summary:*\n`;
    message += `• *Tranche ID:* ${item.investmentId}\n`;
    message += `• *Capital Invested:* ${principalFormatted}\n`;
    message += `• *Return Rate:* ${item.returnPercentage}% / month\n`;
    message += `• *Monthly Payout:* ${amountFormatted}\n`;
    message += `• *Scheduled Cycle Date:* ${formatDate(item.dueDate)}\n`;

    if (item.status === 'Overdue') {
      message += `• *Status:* Priority Settlement In Progress\n\n`;
      message += `Our accounts desk has queued your payout for priority clearance. You will receive an official digital receipt with verification link as soon as the bank reference is generated.\n`;
    } else if (item.status === 'Due_Today') {
      message += `• *Status:* Due for Settlement Today\n\n`;
      message += `Our disbursement desk is processing today's bank transfers. Your official voucher and confirmation will be dispatched shortly.\n`;
    } else {
      message += `• *Status:* Scheduled on ${formatDate(item.dueDate)}\n\n`;
      message += `Your investment tranche is active and scheduled for regular disbursement on your cycle date.\n`;
    }

    message += `\nThank you for your valued partnership.\n`;
    message += `_Vantara Trading Operations Desk_`;

    const encoded = encodeURIComponent(message);
    const url = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encoded}`
      : `whatsapp://send?text=${encoded}`;
    const webUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (e) {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device.');
    }
  };

  const getStatusBadgeStyle = (status: PaymentDueStatus) => {
    switch (status) {
      case 'Overdue':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.4)',
          text: '#EF4444',
          icon: '🔴'
        };
      case 'Due_Today':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.4)',
          text: '#F59E0B',
          icon: '🟠'
        };
      case 'Upcoming':
        return {
          bg: 'rgba(99, 102, 241, 0.15)',
          border: 'rgba(99, 102, 241, 0.4)',
          text: '#6366F1',
          icon: '🟡'
        };
      case 'Paid':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.4)',
          text: '#10B981',
          icon: '🟢'
        };
    }
  };

  const renderReminderCard = ({ item }: { item: InvestorPaymentReminderItem }) => {
    const badge = getStatusBadgeStyle(item.status);

    return (
      <View style={styles.card}>
        {/* Top Header: Investor & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.investorInfo}>
            <Text style={styles.investorName}>{item.investorName}</Text>
            <Text style={styles.investorSub}>
              {item.investorId} • {formatPhoneNumber(item.investorPhone)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: badge.bg, borderColor: badge.border }
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>
              {badge.icon} {item.statusLabel}
            </Text>
          </View>
        </View>

        {/* Tranche & Due Date Info */}
        <View style={styles.detailsBox}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tranche / Capital:</Text>
            <Text style={styles.detailValue}>
              {item.investmentId} ({formatCurrency(item.principalAmount)})
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payout Schedule:</Text>
            <Text style={styles.detailValue}>
              {item.returnPercentage}%/mo • Due on {formatDate(item.dueDate)}
            </Text>
          </View>
          {item.bankName ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bank Account:</Text>
              <Text style={styles.detailValue}>
                {item.bankName} ({item.accountNumberMasked})
              </Text>
            </View>
          ) : null}
        </View>

        {/* Financial Highlight Banner */}
        <View
          style={[
            styles.amountBanner,
            item.status === 'Paid' ? styles.amountBannerPaid : styles.amountBannerDue
          ]}
        >
          <View>
            <Text style={styles.amountBannerLabel}>
              {item.status === 'Paid' ? 'TOTAL DISBURSED' : 'MONTHLY PAYOUT EXPECTED'}
            </Text>
            <Text
              style={[
                styles.amountBannerValue,
                item.status === 'Paid' ? styles.amountValuePaid : styles.amountValueDue
              ]}
            >
              {formatCurrency(item.paidAmount || item.monthlyReturnExpected)}
            </Text>
          </View>
          {item.status === 'Paid' && item.paymentId ? (
            <Text style={styles.voucherTag}>Voucher #{item.paymentId}</Text>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          {item.status !== 'Paid' ? (
            <>
              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={() => handlePayNow(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.payNowIcon}>💳</Text>
                <Text style={styles.payNowBtnText}>Pay Now</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => handleSendWhatsAppUpdate(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.whatsappIcon}>💬</Text>
                <Text style={styles.whatsappBtnText}>Send Reminder</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={() => navigation.navigate('InvestorDetails', { investorId: item.investorId })}
              activeOpacity={0.8}
            >
              <Text style={styles.viewProfileIcon}>👤</Text>
              <Text style={styles.viewProfileBtnText}>View Investor Portfolio</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Payment Reminders"
        subtitle={`Investor Disbursement Schedule (${selectedMonth})`}
        user={user}
      />

      {/* Month Navigator Header */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          style={styles.monthArrowBtn}
          onPress={() => handleMonthChange(-1)}
          activeOpacity={0.7}
        >
          <Text style={styles.monthArrowText}>◀</Text>
        </TouchableOpacity>

        <View style={styles.monthTitleBox}>
          <Text style={styles.monthTitle}>{selectedMonth}</Text>
          <Text style={styles.monthSub}>
            {metrics.totalPendingCount} pending • {formatCurrency(metrics.overdueAmount + metrics.dueTodayAmount + metrics.upcomingAmount)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.monthArrowBtn}
          onPress={() => handleMonthChange(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.monthArrowText}>▶</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredReminders}
        keyExtractor={item => `${item.investorId}_${item.investmentId}_${selectedMonth}`}
        renderItem={renderReminderCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReminders(true)}
            tintColor={THEME.colors.accent.indigo}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {/* KPI Summary Cards */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, styles.kpiCardOverdue]}>
                <Text style={styles.kpiLabel}>🔴 OVERDUE</Text>
                <Text style={[styles.kpiValue, styles.kpiTextOverdue]}>
                  {formatCurrency(metrics.overdueAmount)}
                </Text>
                <Text style={styles.kpiSub}>{metrics.overdueCount} tranches overdue</Text>
              </View>

              <View style={[styles.kpiCard, styles.kpiCardDueToday]}>
                <Text style={styles.kpiLabel}>🟠 DUE TODAY</Text>
                <Text style={[styles.kpiValue, styles.kpiTextDueToday]}>
                  {formatCurrency(metrics.dueTodayAmount)}
                </Text>
                <Text style={styles.kpiSub}>{metrics.dueTodayCount} due today</Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, styles.kpiCardUpcoming]}>
                <Text style={styles.kpiLabel}>🟡 UPCOMING</Text>
                <Text style={[styles.kpiValue, styles.kpiTextUpcoming]}>
                  {formatCurrency(metrics.upcomingAmount)}
                </Text>
                <Text style={styles.kpiSub}>{metrics.upcomingCount} scheduled</Text>
              </View>

              <View style={[styles.kpiCard, styles.kpiCardPaid]}>
                <Text style={styles.kpiLabel}>🟢 DISBURSED</Text>
                <Text style={[styles.kpiValue, styles.kpiTextPaid]}>
                  {formatCurrency(metrics.paidAmount)}
                </Text>
                <Text style={styles.kpiSub}>{metrics.paidCount} tranches cleared</Text>
              </View>
            </View>

            {/* Search Bar */}
            <SearchBar
              value={searchQuery}
              onSearch={setSearchQuery}
              placeholder="Search investor, ID, tranche, phone..."
            />

            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPills}
            >
              {[
                { label: 'All', key: 'All', count: reminders.length },
                { label: '🔴 Overdue', key: 'Overdue', count: metrics.overdueCount },
                { label: '🟠 Due Today', key: 'Due_Today', count: metrics.dueTodayCount },
                { label: '🟡 Upcoming', key: 'Upcoming', count: metrics.upcomingCount },
                { label: '🟢 Disbursed', key: 'Paid', count: metrics.paidCount }
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.pill,
                    statusFilter === tab.key && styles.pillActive
                  ]}
                  onPress={() => setStatusFilter(tab.key)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      statusFilter === tab.key && styles.pillTextActive
                    ]}
                  >
                    {tab.label} ({tab.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState message="Reconciling monthly payout schedule..." />
          ) : (
            <EmptyState
              icon="⏰"
              title="No Payouts in this Filter"
              message={
                searchQuery
                  ? 'No investor tranches matched your search query.'
                  : `No disbursements found matching "${statusFilter}" for ${selectedMonth}.`
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background.primary
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    backgroundColor: THEME.colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.background.border
  },
  monthArrowBtn: {
    padding: 8,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'rgba(99, 102, 241, 0.1)'
  },
  monthArrowText: {
    color: THEME.colors.accent.indigo,
    fontWeight: '800',
    fontSize: 14
  },
  monthTitleBox: {
    alignItems: 'center'
  },
  monthTitle: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.text.primary,
    letterSpacing: 0.5
  },
  monthSub: {
    fontSize: 11,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  listContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xxl,
    gap: THEME.spacing.md
  },
  headerBlock: {
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.sm
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12
  },
  kpiCard: {
    flex: 1,
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  kpiCardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  kpiCardDueToday: {
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  kpiCardUpcoming: {
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  kpiCardPaid: {
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800'
  },
  kpiTextOverdue: {
    color: '#EF4444'
  },
  kpiTextDueToday: {
    color: '#F59E0B'
  },
  kpiTextUpcoming: {
    color: '#6366F1'
  },
  kpiTextPaid: {
    color: '#10B981'
  },
  kpiSub: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginTop: 4
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background.card,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  pillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text.secondary
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    gap: 12
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  investorInfo: {
    flex: 1
  },
  investorName: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.text.primary
  },
  investorSub: {
    fontSize: 11,
    color: THEME.colors.text.muted,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800'
  },
  detailsBox: {
    backgroundColor: THEME.colors.background.primary,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    gap: 6
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: 11,
    color: THEME.colors.text.muted
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.text.secondary
  },
  amountBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1
  },
  amountBannerDue: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.25)'
  },
  amountBannerPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  amountBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.5
  },
  amountBannerValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2
  },
  amountValueDue: {
    color: THEME.colors.accent.indigo
  },
  amountValuePaid: {
    color: THEME.colors.accent.emerald
  },
  voucherTag: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.accent.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2
  },
  payNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.accent.indigo,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    gap: 6
  },
  payNowIcon: {
    fontSize: 14
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12
  },
  whatsappBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 211, 102, 0.12)',
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 102, 0.3)',
    gap: 6
  },
  whatsappIcon: {
    fontSize: 14
  },
  whatsappBtnText: {
    color: '#25D366',
    fontWeight: '800',
    fontSize: 12
  },
  viewProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    gap: 6
  },
  viewProfileIcon: {
    fontSize: 14
  },
  viewProfileBtnText: {
    color: THEME.colors.text.secondary,
    fontWeight: '700',
    fontSize: 12
  }
});
