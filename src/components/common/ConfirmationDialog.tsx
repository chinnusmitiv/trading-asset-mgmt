import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback
} from 'react-native';
import { THEME } from '../../constants/theme';
import { Button } from './Button';
import { formatCurrency } from '../../utils/currency';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  amount?: number;
  recipientOrEntity?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'success';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  amount,
  recipientOrEntity,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel
}) => {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {amount !== undefined || recipientOrEntity ? (
                <View style={styles.financialHighlightBox}>
                  {recipientOrEntity ? (
                    <View style={styles.highlightRow}>
                      <Text style={styles.highlightLabel}>Entity / Recipient:</Text>
                      <Text style={styles.highlightValue}>{recipientOrEntity}</Text>
                    </View>
                  ) : null}
                  {amount !== undefined ? (
                    <View style={styles.highlightRow}>
                      <Text style={styles.highlightLabel}>Amount:</Text>
                      <Text style={[styles.highlightValue, styles.amountHighlight]}>
                        {formatCurrency(amount)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <Text style={styles.auditWarning}>
                ℹ️ This operation will create an immutable entry in the financial audit log.
              </Text>

              <View style={styles.actions}>
                <Button
                  title={cancelLabel}
                  onPress={onCancel}
                  variant="secondary"
                  size="md"
                  style={styles.actionBtn}
                  disabled={loading}
                />
                <Button
                  title={confirmLabel}
                  onPress={onConfirm}
                  variant={variant}
                  size="md"
                  loading={loading}
                  style={styles.actionBtn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg
  },
  dialog: {
    backgroundColor: THEME.colors.background.card,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: THEME.colors.background.border
  },
  title: {
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: '700',
    color: THEME.colors.text.primary,
    marginBottom: THEME.spacing.xs
  },
  message: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.secondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.md
  },
  financialHighlightBox: {
    backgroundColor: THEME.colors.background.cardElevated,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    gap: 6
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  highlightLabel: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted
  },
  highlightValue: {
    fontSize: THEME.typography.fontSize.sm,
    color: THEME.colors.text.primary,
    fontWeight: '600'
  },
  amountHighlight: {
    fontSize: THEME.typography.fontSize.base,
    fontWeight: '800',
    color: THEME.colors.accent.emerald
  },
  auditWarning: {
    fontSize: THEME.typography.fontSize.xs,
    color: THEME.colors.text.muted,
    marginBottom: THEME.spacing.lg,
    lineHeight: 16
  },
  actions: {
    flexDirection: 'row',
    gap: THEME.spacing.md
  },
  actionBtn: {
    flex: 1
  }
});
