import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import {
  AmountDisplay,
  EmptyState,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassModal,
  ListRow,
  MemberAvatar,
  MemberPill,
  ScreenLayout,
  StatusChip,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { Colors, Radii, Spacing, Typography } from '../../theme/tokens';
import { Payment, PAYMENT_METHODS, PaymentMethod } from '../../types/models';
import { formatINR, paiseToRupees, rupeesToPaise } from '../../utils/currency';

export default function PaymentsScreen() {
  const {
    currentUser,
    activeHousehold,
    members,
    balances,
    myBalance,
    payments,
    recordPayment,
    updatePaymentStatus,
  } = useApp();

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [statusNote, setStatusNote] = useState('');

  // Record Payment Form State
  const [paidByUserId, setPaidByUserId] = useState<string>(currentUser?.id ?? 'user-vansh');
  const [paidToUserId, setPaidToUserId] = useState<string>('user-ayush');
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Google Pay (GPay)');
  const [referenceId, setReferenceId] = useState('');
  const [note, setNote] = useState('');
  const [attachment, setAttachment] = useState<{ fileUri: string; fileName: string } | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getMemberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.profile.fullName ?? 'Roommate';

  const openRecordModal = (prefill?: {
    fromId: string;
    toId: string;
    amountPaise: number;
  }) => {
    const defaultFrom = prefill?.fromId ?? currentUser?.id ?? 'user-vansh';
    const defaultTo =
      prefill?.toId ??
      members.find((m) => m.userId !== defaultFrom)?.userId ??
      'user-ayush';

    setPaidByUserId(defaultFrom);
    setPaidToUserId(defaultTo);
    setAmountRupees(
      prefill?.amountPaise ? String(paiseToRupees(prefill.amountPaise)) : ''
    );
    setPaymentMethod('Google Pay (GPay)');
    setReferenceId('');
    setNote('');
    setAttachment(undefined);
    setFormError(null);
    setRecordModalOpen(true);
  };

  const handlePickProof = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachment({
          fileUri: asset.uri,
          fileName: asset.fileName ?? `payment-proof-${Date.now()}.jpg`,
        });
      }
    } catch {
      setAttachment({
        fileUri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600',
        fileName: `payment-slip-${Date.now()}.jpg`,
      });
    }
  };

  const handleSavePayment = async () => {
    setFormError(null);
    if (paidByUserId === paidToUserId) {
      setFormError('Payer and recipient must be different roommates');
      return;
    }

    let amountPaise = 0;
    try {
      amountPaise = rupeesToPaise(amountRupees);
    } catch {
      setFormError('Please enter a valid positive payment amount in ₹');
      return;
    }
    if (amountPaise <= 0) {
      setFormError('Payment amount must be greater than ₹0');
      return;
    }

    setSubmitting(true);
    try {
      await recordPayment({
        paidByUserId,
        paidToUserId,
        amountPaise,
        paymentMethod,
        referenceId,
        note,
        status: 'confirmed',
        attachment,
      });
      setRecordModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message ?? 'Could not record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (
    newStatus: 'confirmed' | 'disputed' | 'voided'
  ) => {
    if (!selectedPayment) return;
    await updatePaymentStatus(selectedPayment.id, newStatus, statusNote);
    setSelectedPayment(null);
    setStatusNote('');
  };

  // Gather all pairwise debts across the household
  const allPairwiseDebts = Object.values(balances)
    .flatMap((b) => b.pairwiseDebts)
    .filter(
      (debt, index, arr) =>
        arr.findIndex(
          (d) => d.fromUserId === debt.fromUserId && d.toUserId === debt.toUserId
        ) === index
    );

  return (
    <ScreenLayout>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>
            {activeHousehold?.name.toUpperCase() ?? 'HOUSEHOLD'}
          </Text>
          <Text style={styles.title}>Repayments & Balances</Text>
        </View>
        <GlassButton
          title="Record Payment"
          icon="paper-plane-outline"
          onPress={() => openRecordModal()}
        />
      </View>

      {/* Truthful Manual Recording Notice */}
      <GlassCard variant="subtle" padding="sm" style={styles.disclaimerCard}>
        <View style={styles.disclaimerRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.brand.primary} />
          <Text style={styles.disclaimerText}>
            Payments are manually recorded. Selecting PhonePe/GPay or uploading a screenshot
            attaches proof for your roommates — it does not perform automatic bank verification.
          </Text>
        </View>
      </GlassCard>

      {/* Live Who Owes Whom & One-Tap Settle Suggestions */}
      <GlassCard variant="highlight" style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Suggested Settlements (Derived Balances)</Text>
          <StatusChip
            label={
              (myBalance?.netBalancePaise ?? 0) >= 0
                ? `Net +${formatINR(myBalance?.netBalancePaise ?? 0)}`
                : `Net ${formatINR(myBalance?.netBalancePaise ?? 0)}`
            }
            tone={(myBalance?.netBalancePaise ?? 0) >= 0 ? 'positive' : 'negative'}
          />
        </View>

        {allPairwiseDebts.length === 0 ? (
          <EmptyState
            icon="checkmark-done-circle-outline"
            title="All Roommates Are Settled Up!"
            message="Nobody owes anything right now."
          />
        ) : (
          allPairwiseDebts.map((debt) => {
            const fromName = getMemberName(debt.fromUserId);
            const toName = getMemberName(debt.toUserId);
            return (
              <View
                key={`${debt.fromUserId}-${debt.toUserId}`}
                style={styles.settlementRow}
              >
                <View style={styles.settlementLeft}>
                  <MemberAvatar name={fromName} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settlementText}>
                      {fromName} owes {toName}
                    </Text>
                    <Text style={styles.settlementSub}>
                      Can be paid in full or partially
                    </Text>
                  </View>
                </View>
                <View style={styles.settlementRight}>
                  <AmountDisplay paise={debt.amountPaise} size="sm" tone="negative" />
                  <GlassButton
                    title="Settle"
                    size="sm"
                    onPress={() =>
                      openRecordModal({
                        fromId: debt.fromUserId,
                        toId: debt.toUserId,
                        amountPaise: debt.amountPaise,
                      })
                    }
                  />
                </View>
              </View>
            );
          })
        )}
      </GlassCard>

      {/* Recorded Payments History */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recorded Payment History</Text>
        {payments.length === 0 ? (
          <EmptyState
            icon="swap-horizontal-outline"
            title="No Repayments Recorded Yet"
            message="When a roommate pays back via UPI, Cash, or Bank transfer, record it here with optional screenshot proof."
          />
        ) : (
          payments.map((pay, idx) => {
            const payerName = getMemberName(pay.paidByUserId);
            const recipientName = getMemberName(pay.paidToUserId);
            const statusTone =
              pay.status === 'confirmed'
                ? 'positive'
                : pay.status === 'disputed' || pay.status === 'voided'
                ? 'negative'
                : 'warning';

            return (
              <ListRow
                key={pay.id}
                onPress={() => {
                  setSelectedPayment(pay);
                  setStatusNote(pay.statusNote ?? '');
                }}
                title={`${payerName} paid ${recipientName}`}
                subtitle={`${pay.paymentMethod}${
                  pay.referenceId ? ` • Ref: ${pay.referenceId}` : ''
                }${pay.note ? ` • "${pay.note}"` : ''}`}
                meta={new Date(pay.paymentDate).toLocaleString('en-IN')}
                leftElement={<MemberAvatar name={payerName} />}
                rightElement={
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <AmountDisplay paise={pay.amountPaise} size="sm" tone="positive" />
                    <StatusChip
                      label={
                        pay.attachments.length > 0
                          ? `${pay.status} • Proof`
                          : pay.status
                      }
                      tone={statusTone}
                    />
                  </View>
                }
                showDivider={idx < payments.length - 1}
              />
            );
          })
        )}
      </GlassCard>

      {/* Record Payment Modal */}
      <GlassModal
        visible={recordModalOpen}
        title="Record Roommate Repayment"
        subtitle="Supports full or partial repayments with screenshot proof"
        onClose={() => setRecordModalOpen(false)}
      >
        <Text style={styles.fieldLabel}>Paid By (Sender)</Text>
        <View style={styles.wrapRow}>
          {members.map((m) => (
            <MemberPill
              key={m.userId}
              name={m.profile.fullName}
              selected={paidByUserId === m.userId}
              onPress={() => setPaidByUserId(m.userId)}
            />
          ))}
        </View>

        <Text style={styles.fieldLabel}>Paid To (Recipient)</Text>
        <View style={styles.wrapRow}>
          {members.map((m) => (
            <MemberPill
              key={m.userId}
              name={m.profile.fullName}
              selected={paidToUserId === m.userId}
              onPress={() => setPaidToUserId(m.userId)}
            />
          ))}
        </View>

        <GlassInput
          label="Repayment Amount (₹)"
          placeholder="200"
          value={amountRupees}
          onChangeText={setAmountRupees}
          prefixText="₹"
          keyboardType="numeric"
        />

        <Text style={styles.fieldLabel}>Payment Method</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: Spacing.sm }}
        >
          {PAYMENT_METHODS.map((pm) => {
            const selected = paymentMethod === pm;
            return (
              <Pressable
                key={pm}
                onPress={() => setPaymentMethod(pm)}
                style={[styles.choiceChip, selected && styles.choiceChipSelected]}
              >
                <Text
                  style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}
                >
                  {pm}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <GlassInput
          label="UPI / Bank Transaction Reference ID (Optional)"
          placeholder="e.g., UTR 431200991122"
          value={referenceId}
          onChangeText={setReferenceId}
          leftIcon="keypad-outline"
        />

        <GlassInput
          label="Note (Optional)"
          placeholder="e.g., Partial settlement for groceries & Wi-Fi"
          value={note}
          onChangeText={setNote}
          leftIcon="chatbubble-ellipses-outline"
        />

        <View style={styles.proofRow}>
          <GlassButton
            title={
              attachment ? 'Payment Screenshot Attached ✓' : 'Attach UPI / Payment Screenshot'
            }
            variant="secondary"
            size="sm"
            icon="image-outline"
            onPress={handlePickProof}
          />
          {attachment ? (
            <Pressable onPress={() => setAttachment(undefined)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <GlassButton
          title="Save Repayment & Notify Roommate"
          icon="checkmark-circle-outline"
          onPress={handleSavePayment}
          loading={submitting}
          style={{ marginTop: Spacing.sm }}
        />
      </GlassModal>

      {/* Payment Detail & Confirmation/Dispute Modal */}
      <GlassModal
        visible={Boolean(selectedPayment)}
        title="Payment Record Details"
        subtitle="Manually recorded roommate repayment"
        onClose={() => setSelectedPayment(null)}
      >
        {selectedPayment ? (
          <View>
            <GlassCard variant="highlight" padding="sm" style={{ marginBottom: Spacing.sm }}>
              <View style={styles.rowBetween}>
                <AmountDisplay
                  label={`${getMemberName(selectedPayment.paidByUserId)} → ${getMemberName(
                    selectedPayment.paidToUserId
                  )}`}
                  paise={selectedPayment.amountPaise}
                  size="lg"
                  tone="positive"
                />
                <StatusChip label={selectedPayment.status} tone="info" />
              </View>
              <Text style={styles.detailMeta}>
                Method: {selectedPayment.paymentMethod}
                {selectedPayment.referenceId ? ` • Ref: ${selectedPayment.referenceId}` : ''}
              </Text>
              <Text style={styles.detailMeta}>
                Date: {new Date(selectedPayment.paymentDate).toLocaleString('en-IN')}
              </Text>
              {selectedPayment.note ? (
                <Text style={styles.detailMeta}>Note: {selectedPayment.note}</Text>
              ) : null}
            </GlassCard>

            {selectedPayment.attachments.length > 0 ? (
              <View style={{ marginBottom: Spacing.sm }}>
                <Text style={styles.fieldLabel}>Attached Payment Proof Screenshot</Text>
                <Image
                  source={{ uri: selectedPayment.attachments[0].fileUri }}
                  style={styles.proofImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <GlassInput
              label="Confirmation / Correction Note"
              placeholder="Optional note when confirming or disputing"
              value={statusNote}
              onChangeText={setStatusNote}
            />

            <View style={styles.statusActionsRow}>
              <GlassButton
                title="Confirm Received"
                variant="success"
                size="sm"
                onPress={() => handleStatusUpdate('confirmed')}
              />
              <GlassButton
                title="Dispute"
                variant="danger"
                size="sm"
                onPress={() => handleStatusUpdate('disputed')}
              />
              <GlassButton
                title="Void"
                variant="secondary"
                size="sm"
                onPress={() => handleStatusUpdate('voided')}
              />
            </View>
          </View>
        ) : null}
      </GlassModal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  overline: {
    ...Typography.overline,
    color: Colors.brand.primary,
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
  },
  disclaimerCard: {
    marginBottom: Spacing.sm,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.glass.borderSubtle,
  },
  settlementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settlementText: {
    ...Typography.bodyStrong,
    color: Colors.text.primary,
  },
  settlementSub: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  settlementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
    marginTop: 4,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  choiceChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    backgroundColor: Colors.glass.cardSubtle,
    borderWidth: 1,
    borderColor: Colors.glass.borderSubtle,
    marginRight: 8,
  },
  choiceChipSelected: {
    backgroundColor: Colors.brand.primarySoft,
    borderColor: Colors.brand.primary,
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  choiceChipTextSelected: {
    color: Colors.brand.primary,
    fontWeight: '700',
  },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: Spacing.xs,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.semantic.negative,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.negative,
    marginVertical: 4,
  },
  detailMeta: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 3,
  },
  proofImage: {
    width: '100%',
    height: 160,
    borderRadius: Radii.md,
    marginTop: 4,
  },
  statusActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.xs,
  },
});
