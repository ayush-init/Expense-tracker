import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { CalendarDayStatus, CustomCalendar } from '../../components/ui/CustomCalendar';
import { FoodCycleBreakdownCard } from '../../components/food/FoodCycleBreakdownCard';
import { useApp } from '../../context/AppContext';
import { Colors, Radii, Spacing, Typography } from '../../theme/tokens';
import {
  MEAL_SKIP_REASONS,
  MealSkipReason,
  MealType,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../../types/models';
import { getTodayYYYYMMDD } from '../../utils/calendar';
import { formatINR, paiseToRupees, rupeesToPaise } from '../../utils/currency';
import { calculateFoodCycleSummary } from '../../utils/finance';

export default function FoodScreen() {
  const {
    currentUser,
    activeHousehold,
    members,
    activeFoodCycle,
    activeFoodCycleSummary,
    foodCycles,
    mealEntries,
    foodSettlements,
    upsertMeal,
    settleFoodCycle,
  } = useApp();

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(getTodayYYYYMMDD());
  const [inspectedUserId, setInspectedUserId] = useState<string>(
    currentUser?.id ?? 'user-ayush'
  );

  // Skip / Edit Meal Modal State
  const [editingMealType, setEditingMealType] = useState<MealType | null>(null);
  const [skipReason, setSkipReason] = useState<MealSkipReason>(
    'Food provider/uncle did not come'
  );
  const [mealNote, setMealNote] = useState('');
  const [mealError, setMealError] = useState<string | null>(null);

  // Food Cycle Settlement Modal State (Phase 8 integrated seamlessly)
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleMode, setSettleMode] = useState<'full' | 'partial'>('full');
  const [settleAmountRupees, setSettleAmountRupees] = useState('');
  const [settlePayerId, setSettlePayerId] = useState<string>(currentUser?.id ?? 'user-ayush');
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('Google Pay (GPay)');
  const [settleRef, setSettleRef] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleError, setSettleError] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const effectiveTargetUserId = inspectedUserId || currentUser?.id || 'user-ayush';
  const myMembership = members.find((m) => m.userId === currentUser?.id);
  const isAdmin = myMembership?.role === 'admin';
  const canEditInspectedUser =
    effectiveTargetUserId === currentUser?.id || isAdmin;

  const getMemberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.profile.fullName ?? 'Roommate';

  // Build dayStatuses for the selected roommate in the active cycle
  const dayStatuses = useMemo(() => {
    const map: Record<string, CalendarDayStatus> = {};
    for (const m of mealEntries) {
      if (m.userId !== effectiveTargetUserId) continue;
      if (!map[m.mealDate]) {
        map[m.mealDate] = { lunchReceived: true, dinnerReceived: true };
      }
      if (m.mealType === 'lunch') map[m.mealDate].lunchReceived = m.received;
      if (m.mealType === 'dinner') map[m.mealDate].dinnerReceived = m.received;
      map[m.mealDate].hasCustomOverride = true;
    }
    return map;
  }, [mealEntries, effectiveTargetUserId]);

  const selectedDayLunch = useMemo(
    () =>
      mealEntries.find(
        (m) =>
          m.userId === effectiveTargetUserId &&
          m.mealDate === selectedDate &&
          m.mealType === 'lunch' &&
          m.cycleId === activeFoodCycle?.id
      ),
    [mealEntries, effectiveTargetUserId, selectedDate, activeFoodCycle?.id]
  );

  const selectedDayDinner = useMemo(
    () =>
      mealEntries.find(
        (m) =>
          m.userId === effectiveTargetUserId &&
          m.mealDate === selectedDate &&
          m.mealType === 'dinner' &&
          m.cycleId === activeFoodCycle?.id
      ),
    [mealEntries, effectiveTargetUserId, selectedDate, activeFoodCycle?.id]
  );

  const handleMarkMealReceived = async (mealType: MealType) => {
    setMealError(null);
    try {
      await upsertMeal({
        targetUserId: effectiveTargetUserId,
        mealDate: selectedDate,
        mealType,
        received: true,
      });
    } catch (err: any) {
      setMealError(err?.message ?? 'Could not update meal');
    }
  };

  const openSkipModal = (mealType: MealType) => {
    setEditingMealType(mealType);
    setSkipReason('Food provider/uncle did not come');
    setMealNote('');
    setMealError(null);
  };

  const handleConfirmSkipMeal = async () => {
    if (!editingMealType) return;
    setMealError(null);
    try {
      await upsertMeal({
        targetUserId: effectiveTargetUserId,
        mealDate: selectedDate,
        mealType: editingMealType,
        received: false,
        skipReason,
        note: mealNote,
      });
      setEditingMealType(null);
    } catch (err: any) {
      setMealError(err?.message ?? 'Could not mark meal as skipped');
    }
  };

  const openSettleModal = () => {
    const outstanding = activeFoodCycleSummary?.outstandingAmountPaise ?? 0;
    setSettleMode('full');
    setSettleAmountRupees(String(paiseToRupees(outstanding)));
    setSettlePayerId(currentUser?.id ?? members[0]?.userId ?? 'user-ayush');
    setSettleMethod('Google Pay (GPay)');
    setSettleRef('');
    setSettleNote('');
    setSettleError(null);
    setSettleModalOpen(true);
  };

  const handleRecordFoodSettlement = async () => {
    setSettleError(null);
    const outstanding = activeFoodCycleSummary?.outstandingAmountPaise ?? 0;
    let amountPaise = outstanding;

    if (settleMode === 'partial') {
      try {
        amountPaise = rupeesToPaise(settleAmountRupees);
      } catch {
        setSettleError('Enter a valid positive settlement amount');
        return;
      }
    }

    try {
      await settleFoodCycle({
        paidByUserId: settlePayerId,
        amountPaise,
        paymentMethod: settleMethod,
        referenceId: settleRef,
        note: settleNote,
      });
      setSettleModalOpen(false);
    } catch (err: any) {
      setSettleError(err?.message ?? 'Could not record food settlement');
    }
  };

  const targetUserStats = activeFoodCycleSummary?.memberBreakdown[effectiveTargetUserId];
  const archivedCycles = foodCycles.filter((c) => c.status === 'settled');

  return (
    <ScreenLayout>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>
            FOOD PROVIDER: {activeHousehold?.foodProviderName.toUpperCase() ?? 'ROX'} • DEFAULT:{' '}
            {formatINR(activeHousehold?.defaultMealPricePaise ?? 8000)}/MEAL
          </Text>
          <Text style={styles.title}>Personal Meal Calendar</Text>
        </View>
        <GlassButton
          title="History"
          variant="secondary"
          size="sm"
          icon="time-outline"
          onPress={() => setHistoryModalOpen(true)}
        />
      </View>

      {/* Current Food Settlement Cycle Summary Card */}
      {activeFoodCycle && activeFoodCycleSummary ? (
        <FoodCycleBreakdownCard
          cycle={activeFoodCycle}
          summary={activeFoodCycleSummary}
          members={members}
          settlements={foodSettlements}
          defaultMealPricePaise={activeHousehold?.defaultMealPricePaise ?? 8000}
          onPressSettle={openSettleModal}
          onPressHistory={() => setHistoryModalOpen(true)}
        />
      ) : null}

      {/* Personal Calendar Selector (Personal by default; Admin can inspect/correct) */}
      <GlassCard padding="sm" style={styles.sectionCard}>
        <Text style={styles.subHeader}>
          Viewing Personal Meal Calendar For:{' '}
          {effectiveTargetUserId === currentUser?.id
            ? `${getMemberName(effectiveTargetUserId)} (You)`
            : `${getMemberName(effectiveTargetUserId)} ${
                isAdmin ? '(Admin Correction Mode)' : '(Read-Only)'
              }`}
        </Text>
        <View style={styles.wrapRow}>
          {members.map((m) => (
            <MemberPill
              key={m.userId}
              name={m.profile.fullName}
              selected={effectiveTargetUserId === m.userId}
              role={m.userId === currentUser?.id ? 'Me' : undefined}
              onPress={() => setInspectedUserId(m.userId)}
            />
          ))}
        </View>
        <Text style={styles.personalStatsText}>
          {getMemberName(effectiveTargetUserId)}'s Cycle Summary:{' '}
          {targetUserStats?.totalMeals ?? 0} meals received (
          {formatINR(targetUserStats?.totalChargePaise ?? 0)}) •{' '}
          {targetUserStats?.skippedCount ?? 0} skipped (₹0 charged)
        </Text>
      </GlassCard>

      {/* Interactive Monthly Calendar */}
      <View style={styles.sectionCard}>
        <CustomCalendar
          year={calYear}
          month={calMonth}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={(y, m) => {
            setCalYear(y);
            setCalMonth(m);
          }}
          dayStatuses={dayStatuses}
          cycleStartDate={activeFoodCycle?.startDate}
        />
      </View>

      {/* Selected Date Day-Detail Card (Lunch & Dinner Independent Controls) */}
      <GlassCard variant="elevated" style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.overline}>SELECTED DATE</Text>
            <Text style={styles.dayTitle}>
              {getMemberName(effectiveTargetUserId)}'s Meals on {selectedDate}
            </Text>
          </View>
          <StatusChip
            label={`Vendor: ${activeHousehold?.foodProviderName ?? 'Rox'}`}
            tone="neutral"
          />
        </View>

        {mealError ? <Text style={styles.errorText}>{mealError}</Text> : null}

        {/* Lunch Row */}
        {(
          [
            { type: 'lunch' as const, label: 'Lunch', entry: selectedDayLunch, icon: 'sunny-outline' as const },
            { type: 'dinner' as const, label: 'Dinner', entry: selectedDayDinner, icon: 'moon-outline' as const },
          ]
        ).map((slot, idx) => {
          const isReceived = slot.entry ? slot.entry.received : true;
          const isRecorded = Boolean(slot.entry);
          const mealPrice =
            slot.entry?.pricePaise ?? activeHousehold?.defaultMealPricePaise ?? 8000;

          return (
            <View
              key={slot.type}
              style={[styles.mealSlotRow, idx === 0 && styles.mealSlotDivider]}
            >
              <View style={styles.mealSlotLeft}>
                <View
                  style={[
                    styles.mealIconCircle,
                    {
                      backgroundColor: isReceived
                        ? Colors.semantic.positiveBg
                        : Colors.semantic.warningBg,
                    },
                  ]}
                >
                  <Ionicons
                    name={slot.icon}
                    size={20}
                    color={isReceived ? Colors.semantic.positive : Colors.semantic.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealSlotTitle}>
                    {slot.label} •{' '}
                    {isReceived
                      ? `Charged ${formatINR(mealPrice)}`
                      : 'Skipped / Not Charged (₹0)'}
                  </Text>
                  <Text style={styles.mealSlotSub}>
                    {isRecorded
                      ? isReceived
                        ? `Confirmed received from ${slot.entry?.providerName}`
                        : `Not received — Reason: ${slot.entry?.skipReason}${
                            slot.entry?.note ? ` (${slot.entry.note})` : ''
                          }`
                      : 'Default expected — tap Confirm or Uncheck below'}
                  </Text>
                </View>
              </View>

              {canEditInspectedUser ? (
                <View style={styles.mealActionBtns}>
                  <GlassButton
                    title={isRecorded && isReceived ? 'Received ✓' : 'Confirm Had'}
                    size="sm"
                    variant={isRecorded && isReceived ? 'success' : 'secondary'}
                    onPress={() => handleMarkMealReceived(slot.type)}
                  />
                  <GlassButton
                    title={!isReceived ? 'Skipped' : 'Uncheck Meal'}
                    size="sm"
                    variant={!isReceived ? 'danger' : 'ghost'}
                    onPress={() => openSkipModal(slot.type)}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </GlassCard>

      {/* Uncheck / Skip Meal Reason Modal */}
      <GlassModal
        visible={Boolean(editingMealType)}
        title={`Uncheck ${editingMealType === 'lunch' ? 'Lunch' : 'Dinner'} on ${selectedDate}`}
        subtitle="Skipped or undelivered meals are charged ₹0"
        onClose={() => setEditingMealType(null)}
      >
        <Text style={styles.subHeader}>Select Reason:</Text>
        {MEAL_SKIP_REASONS.map((reason) => {
          const active = skipReason === reason;
          return (
            <Pressable
              key={reason}
              onPress={() => setSkipReason(reason)}
              style={[styles.reasonOption, active && styles.reasonOptionActive]}
            >
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={active ? Colors.brand.primary : Colors.text.muted}
              />
              <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                {reason}
              </Text>
            </Pressable>
          );
        })}

        <GlassInput
          label="Optional Note"
          placeholder="e.g., Ate outside with friends"
          value={mealNote}
          onChangeText={setMealNote}
          containerStyle={{ marginTop: Spacing.xs }}
        />

        <GlassButton
          title="Save as Not Received (₹0 Charge)"
          variant="danger"
          icon="close-circle-outline"
          onPress={handleConfirmSkipMeal}
        />
      </GlassModal>

      {/* Record Food Cycle Settlement Modal (Full or Partial) */}
      <GlassModal
        visible={settleModalOpen}
        title={`Settle ${activeHousehold?.foodProviderName ?? 'Rox'} Food Bill`}
        subtitle={`Current cycle started ${activeFoodCycle?.startDate} • Outstanding: ${formatINR(
          activeFoodCycleSummary?.outstandingAmountPaise ?? 0
        )}`}
        onClose={() => setSettleModalOpen(false)}
      >
        <View style={styles.modeTabs}>
          <Pressable
            onPress={() => {
              setSettleMode('full');
              setSettleAmountRupees(
                String(paiseToRupees(activeFoodCycleSummary?.outstandingAmountPaise ?? 0))
              );
            }}
            style={[styles.modeTab, settleMode === 'full' && styles.modeTabActive]}
          >
            <Text style={[styles.modeTabText, settleMode === 'full' && styles.modeTabTextActive]}>
              Full Settlement (Closes Cycle)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSettleMode('partial')}
            style={[styles.modeTab, settleMode === 'partial' && styles.modeTabActive]}
          >
            <Text
              style={[styles.modeTabText, settleMode === 'partial' && styles.modeTabTextActive]}
            >
              Partial Settlement
            </Text>
          </Pressable>
        </View>

        {settleMode === 'partial' ? (
          <GlassInput
            label="Partial Amount Paid to Vendor (₹)"
            value={settleAmountRupees}
            onChangeText={setSettleAmountRupees}
            prefixText="₹"
            keyboardType="numeric"
            helperText="Leaves remaining unpaid balance visible in the active cycle."
          />
        ) : (
          <GlassCard variant="highlight" padding="sm" style={{ marginBottom: Spacing.sm }}>
            <Text style={styles.subHeader}>
              Full Settlement Amount:{' '}
              {formatINR(activeFoodCycleSummary?.outstandingAmountPaise ?? 0)}
            </Text>
            <Text style={styles.personalStatsText}>
              Closes the current cycle, archives all meal records in history, and starts a new
              cycle from ₹0.
            </Text>
          </GlassCard>
        )}

        <Text style={styles.subHeader}>Which Roommate Paid the Vendor?</Text>
        <View style={styles.wrapRow}>
          {members.map((m) => (
            <MemberPill
              key={m.userId}
              name={m.profile.fullName}
              selected={settlePayerId === m.userId}
              onPress={() => setSettlePayerId(m.userId)}
            />
          ))}
        </View>

        <Text style={styles.subHeader}>Payment Method</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: Spacing.sm }}
        >
          {PAYMENT_METHODS.map((pm) => {
            const selected = settleMethod === pm;
            return (
              <Pressable
                key={pm}
                onPress={() => setSettleMethod(pm)}
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
          label="UPI / Transaction Reference ID (Optional)"
          placeholder="e.g., UTR 431298765412"
          value={settleRef}
          onChangeText={setSettleRef}
        />

        <GlassInput
          label="Settlement Note (Optional)"
          placeholder="e.g., Paid Rox uncle for 1st–12th meals"
          value={settleNote}
          onChangeText={setSettleNote}
        />

        {settleError ? <Text style={styles.errorText}>{settleError}</Text> : null}

        <GlassButton
          title={
            settleMode === 'full'
              ? 'Confirm Full Settlement & Start New Cycle'
              : 'Record Partial Food Payment'
          }
          icon="checkmark-done-outline"
          onPress={handleRecordFoodSettlement}
        />
      </GlassModal>

      {/* Food Cycle History Modal */}
      <GlassModal
        visible={historyModalOpen}
        title="Food Cycle & Settlement History"
        subtitle="Past settled cycles and partial payments are preserved permanently"
        onClose={() => setHistoryModalOpen(false)}
      >
        {foodSettlements.length === 0 && archivedCycles.length === 0 ? (
          <EmptyState
            title="No Past Settlements Yet"
            message="When you settle a food cycle with Rox, the cycle breakdown and payment history will be archived here."
          />
        ) : (
          <View>
            {foodCycles.map((cycle) => {
              const summary = calculateFoodCycleSummary(
                cycle,
                mealEntries,
                foodSettlements,
                members.map((m) => m.userId)
              );
              return (
                <GlassCard
                  key={cycle.id}
                  variant="subtle"
                  padding="sm"
                  style={{ marginBottom: Spacing.sm }}
                >
                  <View style={styles.rowBetween}>
                    <Text style={styles.subHeader}>
                      Cycle: {cycle.startDate} → {cycle.endDate ?? 'Present'}
                    </Text>
                    <StatusChip
                      label={cycle.status === 'settled' ? 'Settled' : 'Active'}
                      tone={cycle.status === 'settled' ? 'positive' : 'info'}
                    />
                  </View>
                  <Text style={styles.personalStatsText}>
                    Total Meals: {summary.totalMealsCount} • Bill:{' '}
                    {formatINR(summary.totalAmountPaise)} • Paid:{' '}
                    {formatINR(summary.settledAmountPaise)} • Remaining:{' '}
                    {formatINR(summary.outstandingAmountPaise)}
                  </Text>
                </GlassCard>
              );
            })}
          </View>
        )}
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
  sectionCard: {
    marginBottom: Spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  cycleBadge: {
    ...Typography.overline,
    color: Colors.brand.primary,
  },
  cycleTitle: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  cycleMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.sm,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    backgroundColor: Colors.glass.cardElevated,
    padding: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  memberBreakdownBox: {
    backgroundColor: Colors.glass.cardSubtle,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: Spacing.sm,
  },
  subHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  memberCycleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  memberCycleName: {
    fontSize: 13,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  memberCycleAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.brand.primary,
  },
  settleBtnRow: {
    marginTop: 4,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  personalStatsText: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  dayTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  mealSlotRow: {
    paddingVertical: 12,
  },
  mealSlotDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.borderSubtle,
  },
  mealSlotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  mealIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealSlotTitle: {
    ...Typography.bodyStrong,
    color: Colors.text.primary,
  },
  mealSlotSub: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  mealActionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.glass.borderSubtle,
    backgroundColor: Colors.glass.cardSubtle,
    marginBottom: 8,
    gap: 10,
  },
  reasonOptionActive: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.brand.primarySoft,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  reasonTextActive: {
    color: Colors.brand.primary,
    fontWeight: '700',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: Radii.md,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radii.sm,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: Colors.glass.cardElevated,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.muted,
  },
  modeTabTextActive: {
    color: Colors.brand.primary,
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
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.negative,
    marginVertical: 4,
  },
});
