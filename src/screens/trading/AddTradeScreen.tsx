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
import { Staff, TradeType } from '../../types';
import {
  calculateTradePnL,
  calculateStaffShare,
  calculateCompanyShare,
  calculateROI
} from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';

export const AddTradeScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, repository } = useAuth();
  const prefilledStaffId = route.params?.staffId;

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    prefilledStaffId || (user?.role === 'Staff' ? user.staffId || '' : '')
  );
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [asset, setAsset] = useState('BANKNIFTY_FUT');
  const [tradeType, setTradeType] = useState<TradeType>('INTRADAY');
  const [capitalUsed, setCapitalUsed] = useState<number>(2000000); // 20 Lakhs default margin
  const [entryPrice, setEntryPrice] = useState<string>('51200');
  const [exitPrice, setExitPrice] = useState<string>('51550');
  const [quantity, setQuantity] = useState<string>('300');
  const [grossProfit, setGrossProfit] = useState<number>(105000);
  const [grossLoss, setGrossLoss] = useState<number>(0);
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
        setSelectedStaffId(list[0].staffId);
      }
    } catch (e) {
      // Ignore
    }
  };

  const selectedStaff = staffList.find(s => s.staffId === selectedStaffId);
  const appliedPercentage = selectedStaff ? selectedStaff.tradingPercentage : 20;

  // Real-time calculations
  const netPnL = calculateTradePnL(grossProfit, grossLoss);
  const staffShare = calculateStaffShare(netPnL, appliedPercentage);
  const companyShare = calculateCompanyShare(netPnL, staffShare);
  const roiPercentage = calculateROI(netPnL, capitalUsed);

  const handleSave = async () => {
    if (!selectedStaffId) {
      Alert.alert('Validation Error', 'Please select the executing trader.');
      return;
    }
    if (!asset.trim()) {
      Alert.alert('Validation Error', 'Asset / Instrument name is required.');
      return;
    }
    if (capitalUsed <= 0) {
      Alert.alert('Validation Error', 'Capital Used / Margin must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const requestId = 'REQ-TRD-' + Date.now();
      const trade = await repository.createTrade(
        {
          staffId: selectedStaffId,
          tradeDate,
          asset: asset.trim().toUpperCase(),
          tradeType,
          capitalUsed,
          entryPrice: parseFloat(entryPrice) || 0,
          exitPrice: parseFloat(exitPrice) || 0,
          quantity: parseFloat(quantity) || 1,
          grossProfit,
          grossLoss,
          status: 'Submitted',
          notes: notes.trim() || undefined,
          createdBy: user?.userId || 'USR-00001'
        },
        requestId
      );

      Alert.alert(
        'Trade Logged',
        `Trade ${trade.tradeId} recorded with Net P&L ${formatCurrency(trade.netPnL)}.`,
        [
          {
            text: 'View Trade',
            onPress: () => navigation.replace('TradeDetails', { tradeId: trade.tradeId })
          }
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to record trade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Log Trade Execution"
        subtitle="Prop Trading Desk Book"
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Real-time Dynamic P&L & Profit Splits Calculation Banner */}
          <View style={styles.pnlBanner}>
            <Text style={styles.pnlBannerTitle}>PROJECTED REALIZED NET P&L</Text>
            <Text
              style={[
                styles.pnlBannerValue,
                { color: netPnL >= 0 ? THEME.colors.accent.emerald : THEME.colors.accent.rose }
              ]}
            >
              {formatCurrency(netPnL)}
            </Text>

            <View style={styles.splitRow}>
              <View style={styles.splitItem}>
                <Text style={styles.splitLabel}>Trader Cut ({appliedPercentage}%)</Text>
                <Text style={[styles.splitVal, { color: THEME.colors.accent.indigo }]}>
                  {formatCurrency(staffShare)}
                </Text>
              </View>
              <View style={styles.splitItem}>
                <Text style={styles.splitLabel}>Company Retained</Text>
                <Text style={[styles.splitVal, { color: THEME.colors.accent.emerald }]}>
                  {formatCurrency(companyShare)}
                </Text>
              </View>
              <View style={styles.splitItem}>
                <Text style={styles.splitLabel}>Trade ROI</Text>
                <Text style={[styles.splitVal, { color: THEME.colors.accent.cyan }]}>
                  {roiPercentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Select Executing Trader */}
          {user?.role !== 'Staff' && staffList.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>EXECUTING TRADER & POLICY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.traderRow}>
                {staffList.map(s => (
                  <TouchableOpacity
                    key={s.staffId}
                    style={[
                      styles.traderPill,
                      selectedStaffId === s.staffId && styles.traderPillActive
                    ]}
                    onPress={() => setSelectedStaffId(s.staffId)}
                  >
                    <Text
                      style={[
                        styles.traderName,
                        selectedStaffId === s.staffId && styles.traderTextActive
                      ]}
                    >
                      {s.name}
                    </Text>
                    <Text
                      style={[
                        styles.traderCut,
                        selectedStaffId === s.staffId && styles.traderTextActive
                      ]}
                    >
                      {s.tradingPercentage}% Cut • {s.department}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Instrument & Execution Parameters */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TRADE PARTICULARS</Text>

            <Input
              label="Asset / Instrument Symbol *"
              value={asset}
              onChangeText={setAsset}
              autoCapitalize="characters"
              placeholder="e.g. BANKNIFTY_FUT, NIFTY_24500_PE, RELIANCE"
            />

            {/* Trade Type Selector */}
            <Text style={styles.inputLabel}>Trade Strategy / Type</Text>
            <View style={styles.typeRow}>
              {(['INTRADAY', 'OPTION', 'SWING', 'BUY', 'SELL'] as TradeType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    tradeType === t && styles.typeBtnActive
                  ]}
                  onPress={() => setTradeType(t)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      tradeType === t && styles.typeBtnTextActive
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <CurrencyInput
              label="Capital Used / Margin Allocated *"
              value={capitalUsed}
              onChangeValue={setCapitalUsed}
              placeholder="20,00,000"
            />

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Entry Price"
                  value={entryPrice}
                  onChangeText={setEntryPrice}
                  keyboardType="numeric"
                  placeholder="51200"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Exit Price"
                  value={exitPrice}
                  onChangeText={setExitPrice}
                  keyboardType="numeric"
                  placeholder="51550"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Quantity"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="300"
                />
              </View>
            </View>

            <Input
              label="Execution Date (YYYY-MM-DD) *"
              value={tradeDate}
              onChangeText={setTradeDate}
              placeholder="2026-09-02"
            />
          </View>

          {/* Realized Financial Outcomes */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>REALIZED EARNINGS / LOSS</Text>

            <CurrencyInput
              label="Gross Profit (INR)"
              value={grossProfit}
              onChangeValue={setGrossProfit}
              placeholder="1,05,000"
            />

            <CurrencyInput
              label="Gross Loss (INR)"
              value={grossLoss}
              onChangeValue={setGrossLoss}
              placeholder="0"
            />

            <Input
              label="Trade Rationale & Journal Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Breakout retest on 15-min chart"
            />
          </View>

          <Button
            title="Log Trade Execution"
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
  pnlBanner: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  pnlBannerTitle: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.secondary,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  pnlBannerValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '800',
    marginVertical: 4
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.background.divider
  },
  splitItem: {
    alignItems: 'center',
    flex: 1
  },
  splitLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted,
    marginBottom: 2
  },
  splitVal: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '800'
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
  traderRow: {
    gap: 8
  },
  traderPill: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    minWidth: 130
  },
  traderPillActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  traderName: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  traderCut: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    marginTop: 2
  },
  traderTextActive: {
    color: '#FFF'
  },
  inputLabel: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    fontWeight: '600',
    marginTop: THEME.spacing.sm,
    marginBottom: 6
  },
  typeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  typeBtnActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  typeBtnText: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    fontWeight: '700'
  },
  typeBtnTextActive: {
    color: '#FFF'
  },
  formRow: {
    flexDirection: 'row',
    gap: 8
  },
  saveBtn: {
    marginTop: THEME.spacing.xs
  }
});
