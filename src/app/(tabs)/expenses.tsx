import React, { useMemo, useState } from 'react';
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
import {
  Expense,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  PAYMENT_METHODS,
  PaymentMethod,
  SplitType,
} from '../../types/models';
import { formatINR, rupeesToPaise } from '../../utils/currency';
import { calculateEqualSplits, validateSplitsExactSum } from '../../utils/finance';

export default function ExpensesScreen() {
  const {
    currentUser,
    activeHousehold,
    members,
    expenses,
    addExpense,
    voidExpense,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState<string | null>(null);

  // Add Expense Form State
  const [title, setTitle] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Groceries');
  const [paidByUserId, setPaidByUserId] = useState<string>(currentUser?.id ?? 'user-ayush');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [participantIds, setParticipantIds] = useState<string[]>(
    members.map((m) => m.userId)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Google Pay (GPay)');
  const [note, setNote] = useState('');
  const [attachment, setAttachment] = useState<{ fileUri: string; fileName: string } | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getMemberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.profile.fullName ?? 'Roommate';

  const openAddModal = () => {
    setTitle('');
    setAmountRupees('');
    setCategory('Groceries');
    setPaidByUserId(currentUser?.id ?? members[0]?.userId ?? 'user-ayush');
    setSplitType('equal');
    setParticipantIds(members.map((m) => m.userId));
    setPaymentMethod('Google Pay (GPay)');
    setNote('');
    setAttachment(undefined);
    setFormError(null);
    setAddModalOpen(true);
  };

  const toggleParticipant = (uid: string) => {
    setParticipantIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  // Live Split Preview
  const splitPreview = useMemo(() => {
    try {
      const paise = rupeesToPaise(amountRupees);
      if (paise <= 0) return [];
      if (splitType === 'personal') {
        return [{ userId: paidByUserId, sharePaise: paise }];
      }
      if (participantIds.length === 0) return [];
      return calculateEqualSplits(paise, participantIds);
    } catch {
      return [];
    }
  }, [amountRupees, splitType, paidByUserId, participantIds]);

  const handlePickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachment({
          fileUri: asset.uri,
          fileName: asset.fileName ?? `receipt-${Date.now()}.jpg`,
        });
      }
    } catch {
      // Fallback sample receipt URI if running on simulator/web without gallery
      setAttachment({
        fileUri: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        fileName: `receipt-${Date.now()}.jpg`,
      });
    }
  };

  const handleSaveExpense = async () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('Please enter an expense title');
      return;
    }

    let amountPaise = 0;
    try {
      amountPaise = rupeesToPaise(amountRupees);
    } catch {
      setFormError('Please enter a valid positive amount in ₹');
      return;
    }
    if (amountPaise <= 0) {
      setFormError('Amount must be greater than ₹0');
      return;
    }
    if (splitType !== 'personal' && participantIds.length === 0) {
      setFormError('Please select at least one roommate to share this expense');
      return;
    }
    if (!validateSplitsExactSum(amountPaise, splitPreview)) {
      setFormError('Split shares must add up exactly to the expense amount');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({
        title: title.trim(),
        amountPaise,
        category,
        paidByUserId,
        participantUserIds: splitType === 'personal' ? [paidByUserId] : participantIds,
        splitType,
        paymentMethod,
        note,
        attachment,
      });
      setAddModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message ?? 'Could not save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoidExpense = async () => {
    if (!selectedExpense) return;
    setVoidError(null);
    if (!voidReason.trim()) {
      setVoidError('Please provide a reason before cancelling this expense');
      return;
    }
    try {
      await voidExpense(selectedExpense.id, voidReason);
      setSelectedExpense(null);
      setVoidReason('');
    } catch (err: any) {
      setVoidError(err?.message ?? 'Could not cancel expense');
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) return false;
      if (
        searchQuery.trim() &&
        !exp.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, searchQuery]);

  const totalActiveMonthPaise = useMemo(() => {
    return expenses
      .filter((e) => e.status === 'active')
      .reduce((acc, e) => acc + e.amountPaise, 0);
  }, [expenses]);

  return (
    <ScreenLayout>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>
            {activeHousehold?.name.toUpperCase() ?? 'HOUSEHOLD'}
          </Text>
          <Text style={styles.title}>Household Expenses</Text>
        </View>
        <GlassButton
          title="Add Expense"
          icon="add-circle-outline"
          onPress={openAddModal}
        />
      </View>

      {/* Summary Banner */}
      <GlassCard variant="highlight" style={styles.summaryCard}>
        <View style={styles.rowBetween}>
          <AmountDisplay
            label="Total Active Household Bills"
            paise={totalActiveMonthPaise}
            size="lg"
            tone="brand"
            sublabel="Only selected participants are charged for each purchase"
          />
          <StatusChip
            label={`${expenses.filter((e) => e.status === 'active').length} Active`}
            tone="positive"
            icon="receipt-outline"
          />
        </View>
      </GlassCard>

      {/* Search & Category Filter */}
      <GlassInput
        placeholder="Search groceries, Wi-Fi, electricity..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon="search-outline"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFilterRow}
      >
        {(['ALL', ...EXPENSE_CATEGORIES] as const).map((cat) => {
          const active = categoryFilter === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setCategoryFilter(cat)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Expenses List */}
      <GlassCard style={styles.listCard}>
        {filteredExpenses.length === 0 ? (
          <EmptyState
            icon="cart-outline"
            title="No Expenses Found"
            message="Tap Add Expense to record groceries, Wi-Fi, rent, or personal purchases."
            actionTitle="Add First Expense"
            onAction={openAddModal}
          />
        ) : (
          filteredExpenses.map((exp, idx) => {
            const payerName = getMemberName(exp.paidByUserId);
            const myShare =
              exp.splits.find((s) => s.userId === currentUser?.id)?.sharePaise ?? 0;
            const participantNames = exp.splits
              .map((s) => getMemberName(s.userId))
              .join(', ');
            const isVoided = exp.status === 'voided';

            return (
              <ListRow
                key={exp.id}
                onPress={() => {
                  setSelectedExpense(exp);
                  setVoidReason('');
                  setVoidError(null);
                }}
                title={`${exp.title}${isVoided ? ' (VOIDED)' : ''}`}
                subtitle={`Paid by ${payerName} via ${exp.paymentMethod} • ${
                  exp.splitType === 'personal'
                    ? 'Personal expense'
                    : `Shared: ${participantNames}`
                }`}
                meta={`${exp.category} • ${new Date(exp.expenseDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })} • ${
                  myShare > 0
                    ? `Your share: ${formatINR(myShare)}`
                    : 'You are not in this split (₹0)'
                }`}
                leftElement={<MemberAvatar name={payerName} />}
                rightElement={
                  <View style={{ alignItems: 'flex-end' }}>
                    <AmountDisplay
                      paise={exp.amountPaise}
                      size="sm"
                      tone={isVoided ? 'negative' : 'brand'}
                    />
                    {exp.attachments.length > 0 ? (
                      <StatusChip label="Receipt" tone="info" icon="document-attach-outline" />
                    ) : null}
                  </View>
                }
                showDivider={idx < filteredExpenses.length - 1}
              />
            );
          })
        )}
      </GlassCard>

      {/* Add Expense Modal */}
      <GlassModal
        visible={addModalOpen}
        title="Add Household Expense"
        subtitle="Payer and participants are selected independently"
        onClose={() => setAddModalOpen(false)}
      >
        <GlassInput
          label="Expense Title"
          placeholder="e.g., Fresh Vegetables & Milk"
          value={title}
          onChangeText={setTitle}
          leftIcon="pricetag-outline"
        />

        <GlassInput
          label="Amount (₹)"
          placeholder="600"
          value={amountRupees}
          onChangeText={setAmountRupees}
          prefixText="₹"
          keyboardType="numeric"
        />

        {/* Category Selector */}
        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: Spacing.sm }}
        >
          {EXPENSE_CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.choiceChip, selected && styles.choiceChipSelected]}
              >
                <Text
                  style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Payer Selector */}
        <Text style={styles.fieldLabel}>Paid By</Text>
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

        {/* Split Type Selector */}
        <Text style={styles.fieldLabel}>Split Type</Text>
        <View style={styles.splitTypeRow}>
          <Pressable
            onPress={() => setSplitType('equal')}
            style={[
              styles.splitTypeTab,
              splitType === 'equal' && styles.splitTypeTabActive,
            ]}
          >
            <Text
              style={[
                styles.splitTypeText,
                splitType === 'equal' && styles.splitTypeTextActive,
              ]}
            >
              Equal Split (Selected Roommates)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSplitType('personal')}
            style={[
              styles.splitTypeTab,
              splitType === 'personal' && styles.splitTypeTabActive,
            ]}
          >
            <Text
              style={[
                styles.splitTypeText,
                splitType === 'personal' && styles.splitTypeTextActive,
              ]}
            >
              Personal Only (No Split)
            </Text>
          </Pressable>
        </View>

        {/* Independent Participant Selector */}
        {splitType !== 'personal' ? (
          <>
            <Text style={styles.fieldLabel}>
              Who Shares This Expense? (Payer can be included or excluded)
            </Text>
            <View style={styles.wrapRow}>
              {members.map((m) => (
                <MemberPill
                  key={m.userId}
                  name={m.profile.fullName}
                  selected={participantIds.includes(m.userId)}
                  onPress={() => toggleParticipant(m.userId)}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* Live Split Preview Card */}
        {splitPreview.length > 0 ? (
          <GlassCard variant="highlight" padding="sm" style={{ marginBottom: Spacing.sm }}>
            <Text style={styles.previewTitle}>Live Split Preview (Exact Paise Sum)</Text>
            {splitPreview.map((sp) => (
              <View key={sp.userId} style={styles.previewRow}>
                <Text style={styles.previewMember}>{getMemberName(sp.userId)}</Text>
                <Text style={styles.previewAmount}>{formatINR(sp.sharePaise)}</Text>
              </View>
            ))}
          </GlassCard>
        ) : null}

        {/* Payment Method Selector */}
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
          label="Note / Description (Optional)"
          placeholder="e.g., Bought from Reliance Smart"
          value={note}
          onChangeText={setNote}
          leftIcon="document-text-outline"
        />

        {/* Optional Receipt / Bill Attachment */}
        <View style={styles.attachmentRow}>
          <GlassButton
            title={attachment ? 'Receipt Attached ✓' : 'Attach Bill / Receipt Photo'}
            variant="secondary"
            size="sm"
            icon="camera-outline"
            onPress={handlePickReceipt}
          />
          {attachment ? (
            <Pressable onPress={() => setAttachment(undefined)}>
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

        <GlassButton
          title="Save Expense & Notify Selected Roommates"
          icon="checkmark-circle-outline"
          onPress={handleSaveExpense}
          loading={submitting}
          style={{ marginTop: Spacing.sm }}
        />
      </GlassModal>

      {/* Expense Details & Audit/Void Modal */}
      <GlassModal
        visible={Boolean(selectedExpense)}
        title={selectedExpense?.title ?? 'Expense Details'}
        subtitle={
          selectedExpense
            ? `${selectedExpense.category} • Added by ${getMemberName(
                selectedExpense.createdByUserId
              )}`
            : ''
        }
        onClose={() => setSelectedExpense(null)}
      >
        {selectedExpense ? (
          <View>
            <GlassCard variant="highlight" padding="sm" style={{ marginBottom: Spacing.sm }}>
              <View style={styles.rowBetween}>
                <AmountDisplay
                  label="Total Expense Amount"
                  paise={selectedExpense.amountPaise}
                  size="lg"
                  tone="brand"
                />
                <StatusChip
                  label={selectedExpense.status === 'active' ? 'Active' : 'Voided'}
                  tone={selectedExpense.status === 'active' ? 'positive' : 'negative'}
                />
              </View>
              <Text style={styles.detailMeta}>
                Paid by {getMemberName(selectedExpense.paidByUserId)} via{' '}
                {selectedExpense.paymentMethod}
              </Text>
              <Text style={styles.detailMeta}>
                Recorded on {new Date(selectedExpense.expenseDate).toLocaleString('en-IN')}
              </Text>
              {selectedExpense.note ? (
                <Text style={styles.detailNote}>Note: {selectedExpense.note}</Text>
              ) : null}
            </GlassCard>

            <Text style={styles.fieldLabel}>Member Share Breakdown</Text>
            {selectedExpense.splits.map((s) => (
              <View key={s.id} style={styles.previewRow}>
                <Text style={styles.previewMember}>{getMemberName(s.userId)}</Text>
                <Text style={styles.previewAmount}>{formatINR(s.sharePaise)}</Text>
              </View>
            ))}

            {selectedExpense.attachments.length > 0 ? (
              <View style={{ marginTop: Spacing.sm }}>
                <Text style={styles.fieldLabel}>Attached Receipt / Bill Proof</Text>
                <Image
                  source={{ uri: selectedExpense.attachments[0].fileUri }}
                  style={styles.receiptPreview}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            {selectedExpense.status === 'active' ? (
              <View style={styles.voidBox}>
                <Text style={styles.fieldLabel}>Cancel / Void Expense (Preserves Audit Trail)</Text>
                <GlassInput
                  placeholder="Enter reason for voiding (e.g., Duplicate entry or wrong amount)"
                  value={voidReason}
                  onChangeText={setVoidReason}
                />
                {voidError ? <Text style={styles.errorText}>{voidError}</Text> : null}
                <GlassButton
                  title="Void Expense with Reason"
                  variant="danger"
                  size="sm"
                  icon="close-circle-outline"
                  onPress={handleVoidExpense}
                />
              </View>
            ) : (
              <GlassCard variant="subtle" padding="sm" style={{ marginTop: Spacing.sm }}>
                <Text style={styles.errorText}>
                  Voided by {getMemberName(selectedExpense.voidedByUserId ?? '')} — Reason:{' '}
                  {selectedExpense.voidReason}
                </Text>
              </GlassCard>
            )}
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
  summaryCard: {
    marginBottom: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryFilterRow: {
    paddingVertical: 6,
    gap: 8,
    marginBottom: Spacing.sm,
  },
  filterPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    backgroundColor: Colors.glass.cardSubtle,
    borderWidth: 1,
    borderColor: Colors.glass.borderSubtle,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.secondary,
  },
  filterPillTextActive: {
    color: Colors.text.inverse,
  },
  listCard: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
    marginTop: 4,
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
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  splitTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  splitTypeTab: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.glass.borderSubtle,
    backgroundColor: Colors.glass.cardSubtle,
    alignItems: 'center',
  },
  splitTypeTabActive: {
    backgroundColor: Colors.brand.primarySoft,
    borderColor: Colors.brand.primary,
  },
  splitTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  splitTypeTextActive: {
    color: Colors.brand.primary,
    fontWeight: '700',
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand.primary,
    marginBottom: 6,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.borderSubtle,
  },
  previewMember: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  previewAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.brand.primary,
  },
  attachmentRow: {
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
    marginTop: 4,
  },
  detailNote: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 6,
  },
  receiptPreview: {
    width: '100%',
    height: 160,
    borderRadius: Radii.md,
    marginTop: 4,
  },
  voidBox: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.glass.borderSubtle,
  },
});
