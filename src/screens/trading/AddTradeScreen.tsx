import React, { useState, useEffect, useMemo } from 'react';
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
import {
  TrendingUp,
  TrendingDown,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  DollarSign,
  Percent,
  CheckCircle2,
  RefreshCw
} from 'lucide-react-native';
import { THEME } from '../../constants/theme';
import { AppHeader } from '../../components/common/AppHeader';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../store/AuthContext';
import { Staff, TradeType } from '../../types';
import {
  calculateTradePnL,
  calculateExecutionRealizedPnL,
  calculateStaffShare,
  calculateCompanyShare,
  calculateROI
} from '../../utils/calculations';
import { formatCurrency } from '../../utils/currency';

const POPULAR_INSTRUMENTS = [
  'BANKNIFTY_FUT',
  'NIFTY_FUT',
  'FINNIFTY_FUT',
  'RELIANCE',
  'HDFCBANK',
  'CRUDEOIL'
];

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
  const [isShort, setIsShort] = useState<boolean>(false);

  // Execution parameters
  const [entryPrice, setEntryPrice] = useState<string>('51200');
  const [exitPrice, setExitPrice] = useState<string>('51550');
  const [quantity, setQuantity] = useState<string>('300');
  const [brokerageCharges, setBrokerageCharges] = useState<number>(0);
  const [capitalUsed, setCapitalUsed] = useState<number>(2000000); // 20 Lakhs default margin

  // Calculation mode: 'AUTO' uses entry/exit/qty, 'MANUAL' allows override
  const [calcMode, setCalcMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualGrossProfit, setManualGrossProfit] = useState<number>(105000);
  const [manualGrossLoss, setManualGrossLoss] = useState<number>(0);

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

  // Real-time automatic calculations
  const parsedEntry = parseFloat(entryPrice) || 0;
  const parsedExit = parseFloat(exitPrice) || 0;
  const parsedQty = parseFloat(quantity) || 0;

  const autoCalcResult = useMemo(() => {
    return calculateExecutionRealizedPnL(
      parsedEntry,
      parsedExit,
      parsedQty,
      isShort,
      brokerageCharges
    );
  }, [parsedEntry, parsedExit, parsedQty, isShort, brokerageCharges]);

  // Determine active profit/loss based on mode
  const grossProfit = calcMode === 'AUTO' ? autoCalcResult.grossProfit : manualGrossProfit;
  const grossLoss = calcMode === 'AUTO' ? autoCalcResult.grossLoss : manualGrossLoss;
  const netPnL = calcMode === 'AUTO'
    ? autoCalcResult.netPnL
    : calculateTradePnL(grossProfit, grossLoss) - brokerageCharges;

  const staffShare = calculateStaffShare(netPnL, appliedPercentage);
  const companyShare = calculateCompanyShare(netPnL, staffShare);
  const roiPercentage = calculateROI(netPnL, capitalUsed);

  // Auto-set margin helpers
  const handleSetMarginPercentage = (pct: number) => {
    const turnover = parsedEntry * parsedQty;
    if (turnover > 0) {
      const margin = Math.round((turnover * pct) / 100);
      setCapitalUsed(margin);
    }
  };

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
    if (calcMode === 'AUTO' && (parsedEntry <= 0 || parsedExit <= 0 || parsedQty <= 0)) {
      Alert.alert(
        'Validation Error',
        'Please enter valid positive Entry Price, Exit Price, and Quantity for auto-calculation.'
      );
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
          entryPrice: parsedEntry,
          exitPrice: parsedExit,
          quantity: parsedQty,
          grossProfit,
          grossLoss,
          status: 'Submitted',
          notes: notes.trim() || undefined,
          createdBy: user?.userId || 'USR-00001'
        },
        requestId
      );

      Alert.alert(
        'Trade Logged Successfully',
        `Trade ${trade.tradeId} recorded.\nRealized Net P&L: ${formatCurrency(trade.netPnL)} (${roiPercentage.toFixed(2)}% ROI)`,
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

  const isProfit = netPnL >= 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Log Trade Execution"
        subtitle="Auto-Calculating Realized P&L Desk"
        user={user}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Real-time Dynamic P&L Banner */}
          <View
            style={[
              styles.pnlBanner,
              isProfit ? styles.pnlBannerProfit : styles.pnlBannerLoss
            ]}
          >
            <View style={styles.pnlHeaderRow}>
              <View style={styles.pnlHeaderLeft}>
                <Calculator size={14} color={THEME.colors.text.secondary} />
                <Text style={styles.pnlBannerTitle}>
                  {calcMode === 'AUTO' ? 'AUTO-CALCULATED REALIZED NET P&L' : 'MANUAL OVERRIDE REALIZED NET P&L'}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  isProfit ? styles.statusBadgeProfit : styles.statusBadgeLoss
                ]}
              >
                {isProfit ? (
                  <ArrowUpRight size={12} color={THEME.colors.accent.emerald} />
                ) : (
                  <ArrowDownRight size={12} color={THEME.colors.accent.rose} />
                )}
                <Text
                  style={[
                    styles.statusBadgeText,
                    isProfit ? { color: THEME.colors.accent.emerald } : { color: THEME.colors.accent.rose }
                  ]}
                >
                  {isProfit ? 'PROFIT' : 'LOSS'}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.pnlBannerValue,
                { color: isProfit ? THEME.colors.accent.emerald : THEME.colors.accent.rose }
              ]}
            >
              {isProfit ? '+' : ''}{formatCurrency(netPnL)}
            </Text>

            {calcMode === 'AUTO' && parsedEntry > 0 && parsedExit > 0 && (
              <View style={styles.pointsPill}>
                <Text style={styles.pointsText}>
                  Points:{' '}
                  <Text style={{ fontWeight: '800', color: autoCalcResult.pointsDifference >= 0 ? THEME.colors.accent.emerald : THEME.colors.accent.rose }}>
                    {autoCalcResult.pointsDifference >= 0 ? '+' : ''}{autoCalcResult.pointsDifference.toFixed(2)} pts
                  </Text>{' '}
                  ({autoCalcResult.percentageReturn >= 0 ? '+' : ''}{autoCalcResult.percentageReturn.toFixed(2)}%)
                  {' • '}Turnover: {formatCurrency(autoCalcResult.turnover)}
                </Text>
              </View>
            )}

            {/* Split Breakdown Row */}
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
                <Text style={styles.splitLabel}>ROI on Margin</Text>
                <Text
                  style={[
                    styles.splitVal,
                    { color: roiPercentage >= 0 ? THEME.colors.accent.cyan : THEME.colors.accent.rose }
                  ]}
                >
                  {roiPercentage >= 0 ? '+' : ''}{roiPercentage.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Mode Switcher */}
          <View style={styles.modeSwitchContainer}>
            <TouchableOpacity
              style={[
                styles.modeBtn,
                calcMode === 'AUTO' && styles.modeBtnActive
              ]}
              onPress={() => setCalcMode('AUTO')}
            >
              <Zap size={14} color={calcMode === 'AUTO' ? '#FFF' : THEME.colors.text.secondary} />
              <Text
                style={[
                  styles.modeBtnText,
                  calcMode === 'AUTO' && styles.modeBtnTextActive
                ]}
              >
                Auto-Calculate (Entry/Exit)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeBtn,
                calcMode === 'MANUAL' && styles.modeBtnActive
              ]}
              onPress={() => setCalcMode('MANUAL')}
            >
              <DollarSign size={14} color={calcMode === 'MANUAL' ? '#FFF' : THEME.colors.text.secondary} />
              <Text
                style={[
                  styles.modeBtnText,
                  calcMode === 'MANUAL' && styles.modeBtnTextActive
                ]}
              >
                Direct Gross P&L Entry
              </Text>
            </TouchableOpacity>
          </View>

          {/* Executing Trader Picker */}
          {user?.role !== 'Staff' && staffList.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>EXECUTING TRADER & PROFIT SHARE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.traderRow}>
                {staffList.map((s, idx) => (
                  <TouchableOpacity
                    key={s.staffId || (s as any).staff_id || `staff-${idx}`}
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

          {/* Instrument & Direction */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>INSTRUMENT & EXECUTION PARTICULARS</Text>

            <Input
              label="Asset / Instrument Symbol *"
              value={asset}
              onChangeText={setAsset}
              autoCapitalize="characters"
              placeholder="e.g. BANKNIFTY_FUT, NIFTY_24500_PE, RELIANCE"
            />

            {/* Popular Quick Chips */}
            <View style={styles.chipsRow}>
              {POPULAR_INSTRUMENTS.map(sym => (
                <TouchableOpacity
                  key={sym}
                  style={[
                    styles.chip,
                    asset === sym && styles.chipActive
                  ]}
                  onPress={() => setAsset(sym)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      asset === sym && styles.chipTextActive
                    ]}
                  >
                    {sym}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Position Direction Toggle (Long vs Short) */}
            <Text style={styles.inputLabel}>Position Direction</Text>
            <View style={styles.sideToggleRow}>
              <TouchableOpacity
                style={[
                  styles.sideToggleBtn,
                  !isShort && styles.sideToggleBtnLong
                ]}
                onPress={() => {
                  setIsShort(false);
                  if (tradeType === 'SELL') setTradeType('BUY');
                }}
              >
                <TrendingUp size={16} color={!isShort ? '#FFF' : THEME.colors.text.secondary} />
                <Text
                  style={[
                    styles.sideToggleText,
                    !isShort && styles.sideToggleTextActive
                  ]}
                >
                  LONG (Buy Low → Sell High)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sideToggleBtn,
                  isShort && styles.sideToggleBtnShort
                ]}
                onPress={() => {
                  setIsShort(true);
                  if (tradeType === 'BUY') setTradeType('SELL');
                }}
              >
                <TrendingDown size={16} color={isShort ? '#FFF' : THEME.colors.text.secondary} />
                <Text
                  style={[
                    styles.sideToggleText,
                    isShort && styles.sideToggleTextActive
                  ]}
                >
                  SHORT (Sell High → Cover Low)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trade Strategy Selector */}
            <Text style={styles.inputLabel}>Trade Strategy / Classification</Text>
            <View style={styles.typeRow}>
              {(['INTRADAY', 'OPTION', 'SWING', 'BUY', 'SELL'] as TradeType[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    tradeType === t && styles.typeBtnActive
                  ]}
                  onPress={() => {
                    setTradeType(t);
                    if (t === 'SELL') setIsShort(true);
                    if (t === 'BUY') setIsShort(false);
                  }}
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
          </View>

          {/* Execution Entry / Exit & Auto Realized P&L */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>EXECUTION PRICES & QUANTITY</Text>
              {calcMode === 'AUTO' && (
                <View style={styles.autoCalcBadge}>
                  <CheckCircle2 size={12} color={THEME.colors.accent.emerald} />
                  <Text style={styles.autoCalcBadgeText}>Auto Calculating</Text>
                </View>
              )}
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Entry Price (INR) *"
                  value={entryPrice}
                  onChangeText={setEntryPrice}
                  keyboardType="numeric"
                  placeholder="51200"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Exit Price (INR) *"
                  value={exitPrice}
                  onChangeText={setExitPrice}
                  keyboardType="numeric"
                  placeholder="51550"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Quantity *"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  placeholder="300"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <CurrencyInput
                  label="Brokerage & Taxes (INR)"
                  value={brokerageCharges}
                  onChangeValue={setBrokerageCharges}
                  placeholder="0"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Trade Date (YYYY-MM-DD) *"
                  value={tradeDate}
                  onChangeText={setTradeDate}
                  placeholder="2026-09-02"
                />
              </View>
            </View>

            {/* Real-time preview pill inside form */}
            {calcMode === 'AUTO' && parsedEntry > 0 && parsedExit > 0 && (
              <View style={styles.autoPreviewBox}>
                <View style={styles.autoPreviewRow}>
                  <Text style={styles.autoPreviewLabel}>Turnover Value:</Text>
                  <Text style={styles.autoPreviewValue}>
                    {formatCurrency(parsedEntry * parsedQty)}
                  </Text>
                </View>
                <View style={styles.autoPreviewRow}>
                  <Text style={styles.autoPreviewLabel}>Gross Realized Outcome:</Text>
                  <Text
                    style={[
                      styles.autoPreviewValue,
                      { color: grossProfit > 0 ? THEME.colors.accent.emerald : grossLoss > 0 ? THEME.colors.accent.rose : THEME.colors.text.primary }
                    ]}
                  >
                    {grossProfit > 0 ? `+${formatCurrency(grossProfit)} Profit` : grossLoss > 0 ? `-${formatCurrency(grossLoss)} Loss` : '₹0.00'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Capital Used / Margin Allocated with Quick Tools */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>CAPITAL USED / MARGIN ALLOCATED</Text>
              <Text style={styles.cardSubtitle}>Required for ROI %</Text>
            </View>

            <CurrencyInput
              label="Margin Deployed (INR) *"
              value={capitalUsed}
              onChangeValue={setCapitalUsed}
              placeholder="20,00,000"
            />

            {/* Quick Margin Allocation Buttons */}
            {parsedEntry > 0 && parsedQty > 0 && (
              <View style={styles.marginHelpersRow}>
                <Text style={styles.marginHelperLabel}>Auto-Fill Margin:</Text>
                <TouchableOpacity
                  style={styles.marginChip}
                  onPress={() => handleSetMarginPercentage(100)}
                >
                  <Text style={styles.marginChipText}>100% Turnover</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.marginChip}
                  onPress={() => handleSetMarginPercentage(20)}
                >
                  <Text style={styles.marginChipText}>20% (5x)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.marginChip}
                  onPress={() => handleSetMarginPercentage(10)}
                >
                  <Text style={styles.marginChipText}>10% (10x)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Manual Gross Override Section (when MANUAL mode is chosen) */}
          {calcMode === 'MANUAL' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>MANUAL GROSS EARNINGS / LOSS (INR)</Text>
              <CurrencyInput
                label="Gross Profit (INR)"
                value={manualGrossProfit}
                onChangeValue={setManualGrossProfit}
                placeholder="1,05,000"
              />
              <CurrencyInput
                label="Gross Loss (INR)"
                value={manualGrossLoss}
                onChangeValue={setManualGrossLoss}
                placeholder="0"
              />
            </View>
          )}

          {/* Trade Rationale & Journal */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TRADE RATIONALE & JOURNAL</Text>
            <Input
              label="Execution Notes & Strategy Details"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Breakout retest on 15m chart, SL 51050, Target 51550"
            />
          </View>

          {/* Action Button */}
          <Button
            title={`Log ${isProfit ? 'Profit' : 'Loss'} Trade (${formatCurrency(netPnL)})`}
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
    borderWidth: 1.5,
    borderColor: THEME.colors.background.border,
    alignItems: 'center'
  },
  pnlBannerProfit: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)'
  },
  pnlBannerLoss: {
    borderColor: 'rgba(244, 63, 94, 0.4)',
    backgroundColor: 'rgba(244, 63, 94, 0.04)'
  },
  pnlHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4
  },
  pnlHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  pnlBannerTitle: {
    fontSize: 10,
    color: THEME.colors.text.secondary,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  statusBadgeProfit: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)'
  },
  statusBadgeLoss: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)'
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800'
  },
  pnlBannerValue: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '900',
    marginVertical: 4
  },
  pointsPill: {
    backgroundColor: THEME.colors.background.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  pointsText: {
    fontSize: 11,
    color: THEME.colors.text.secondary
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
  modeSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: THEME.colors.background.border,
    gap: 6
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md
  },
  modeBtnActive: {
    backgroundColor: THEME.colors.accent.indigo
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text.secondary
  },
  modeBtnTextActive: {
    color: '#FFF'
  },
  card: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm
  },
  cardTitle: {
    fontSize: THEME.typography.fontSize.xs,
    fontWeight: '800',
    color: THEME.colors.text.muted,
    letterSpacing: 0.8,
    marginBottom: THEME.spacing.xs
  },
  cardSubtitle: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  autoCalcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.full
  },
  autoCalcBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.accent.emerald
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: THEME.spacing.sm
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  chipActive: {
    backgroundColor: THEME.colors.accent.indigo,
    borderColor: THEME.colors.accent.indigo
  },
  chipText: {
    fontSize: 11,
    color: THEME.colors.text.secondary,
    fontWeight: '600'
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700'
  },
  sideToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 6
  },
  sideToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  sideToggleBtnLong: {
    backgroundColor: THEME.colors.accent.emerald,
    borderColor: THEME.colors.accent.emerald
  },
  sideToggleBtnShort: {
    backgroundColor: THEME.colors.accent.rose,
    borderColor: THEME.colors.accent.rose
  },
  sideToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text.secondary
  },
  sideToggleTextActive: {
    color: '#FFF'
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
  autoPreviewBox: {
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.sm,
    marginTop: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  autoPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2
  },
  autoPreviewLabel: {
    fontSize: 11,
    color: THEME.colors.text.muted
  },
  autoPreviewValue: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.text.primary
  },
  marginHelpersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: THEME.spacing.xs
  },
  marginHelperLabel: {
    fontSize: 10,
    color: THEME.colors.text.muted
  },
  marginChip: {
    backgroundColor: THEME.colors.background.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  marginChipText: {
    fontSize: 10,
    color: THEME.colors.accent.cyan,
    fontWeight: '600'
  },
  saveBtn: {
    marginTop: THEME.spacing.xs
  }
});
