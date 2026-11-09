import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AmountDisplay, GlassButton, GlassCard, StatusChip } from '../ui';
import { Colors, Radii, Spacing, Typography } from '../../theme/tokens';
import { FoodCycle, FoodSettlement, HouseholdMember, Profile } from '../../types/models';
import { FoodCycleSummary } from '../../utils/finance';
import { formatINR } from '../../utils/currency';

export interface FoodCycleBreakdownCardProps {
  cycle: FoodCycle;
  summary: FoodCycleSummary;
  members: Array<HouseholdMember & { profile: Profile }>;
  settlements: FoodSettlement[];
  defaultMealPricePaise: number;
  onPressSettle: () => void;
  onPressHistory: () => void;
}

export function FoodCycleBreakdownCard({
  cycle,
  summary,
  members,
  settlements,
  defaultMealPricePaise,
  onPressSettle,
  onPressHistory,
}: FoodCycleBreakdownCardProps) {
  const cycleSettlements = settlements.filter((s) => s.cycleId === cycle.id);
  const getMemberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.profile.fullName ?? 'Roommate';

  return (
    <GlassCard variant="highlight" style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={styles.badge}>
            SETTLEMENT-BASED CYCLE • SINCE {cycle.startDate}
          </Text>
          <Text style={styles.title}>{cycle.providerName} Running Food Bill</Text>
        </View>
        <StatusChip
          label={`${summary.totalMealsCount} Meals`}
          tone="info"
          icon="restaurant-outline"
        />
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <AmountDisplay
            label="Total Accumulated"
            paise={summary.totalAmountPaise}
            size="md"
          />
        </View>
        <View style={styles.metricBox}>
          <AmountDisplay
            label="Paid So Far"
            paise={summary.settledAmountPaise}
            size="md"
            tone="positive"
          />
        </View>
        <View style={styles.metricBox}>
          <AmountDisplay
            label="Outstanding"
            paise={summary.outstandingAmountPaise}
            size="md"
            tone="brand"
          />
        </View>
      </View>

      {/* Transparent Formula Calculation Breakdown */}
      <View style={styles.formulaBox}>
        <Text style={styles.formulaHeader}>
          Transparent Calculation Breakdown (Default {formatINR(defaultMealPricePaise)}/meal):
        </Text>
        {members.map((m) => {
          const b = summary.memberBreakdown[m.userId];
          const meals = b?.totalMeals ?? 0;
          const skipped = b?.skippedCount ?? 0;
          return (
            <View key={m.userId} style={styles.formulaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.profile.fullName}</Text>
                <Text style={styles.formulaMath}>
                  {b?.lunchCount ?? 0} Lunch + {b?.dinnerCount ?? 0} Dinner = {meals} charged meals
                  {skipped > 0 ? ` (${skipped} skipped @ ₹0)` : ''}
                </Text>
              </View>
              <Text style={styles.memberTotal}>{formatINR(b?.totalChargePaise ?? 0)}</Text>
            </View>
          );
        })}
      </View>

      {/* Partial Settlements Recorded in Active Cycle */}
      {cycleSettlements.length > 0 ? (
        <View style={styles.partialBox}>
          <Text style={styles.formulaHeader}>Payments Recorded in This Cycle:</Text>
          {cycleSettlements.map((s) => (
            <Text key={s.id} style={styles.partialItem}>
              • {getMemberName(s.paidByUserId)} paid {formatINR(s.amountPaise)} ({s.settlementType})
              via {s.paymentMethod}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <GlassButton
            title={`Settle ${cycle.providerName} Bill`}
            icon="checkmark-done-circle-outline"
            onPress={onPressSettle}
            disabled={summary.outstandingAmountPaise <= 0}
          />
        </View>
        <GlassButton
          title="Past Cycles"
          variant="secondary"
          icon="archive-outline"
          onPress={onPressHistory}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  badge: {
    ...Typography.overline,
    color: Colors.brand.primary,
  },
  title: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: Spacing.sm,
  },
  metricBox: {
    flex: 1,
    backgroundColor: Colors.glass.cardElevated,
    padding: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  formulaBox: {
    backgroundColor: Colors.glass.cardSubtle,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: Spacing.sm,
  },
  formulaHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.borderSubtle,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  formulaMath: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  memberTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.brand.primary,
  },
  partialBox: {
    backgroundColor: Colors.semantic.positiveBg,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.semantic.positiveBorder,
  },
  partialItem: {
    fontSize: 12,
    color: Colors.semantic.positive,
    fontWeight: '600',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
});
