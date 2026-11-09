import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  AmountDisplay,
  EmptyState,
  GlassButton,
  GlassCard,
  ListRow,
  LoadingState,
  MemberAvatar,
  MemberPill,
  ScreenLayout,
  StatusChip,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { Colors, Radii, Spacing, Typography } from '../../theme/tokens';
import { formatINR } from '../../utils/currency';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    isHydrated,
    currentUser,
    activeHousehold,
    members,
    myBalance,
    activeFoodCycle,
    activeFoodCycleSummary,
    activityLogs,
    unreadNotificationCount,
    signInAsRoommate,
  } = useApp();

  if (!isHydrated || !currentUser || !activeHousehold) {
    return (
      <ScreenLayout>
        <LoadingState label="Loading your household dashboard..." />
      </ScreenLayout>
    );
  }

  const netPaise = myBalance?.netBalancePaise ?? 0;
  const owedByMePaise = myBalance?.totalOwedByMePaise ?? 0;
  const owedToMePaise = myBalance?.totalOwedToMePaise ?? 0;
  const paidThisMonthPaise = myBalance?.totalPaidThisMonthPaise ?? 0;

  const myMealStats = activeFoodCycleSummary?.memberBreakdown[currentUser.id];
  const getMemberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.profile.fullName ?? 'Roommate';

  return (
    <ScreenLayout>
      {/* Top Bar: Household Identity & Unread Notification Bell */}
      <View style={styles.topHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.flatBadge}>
            {activeHousehold.name.toUpperCase()} • CODE: {activeHousehold.inviteCode}
          </Text>
          <Text style={styles.welcomeTitle}>Hi, {currentUser.fullName}</Text>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/activity')}
          style={styles.bellButton}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.text.primary} />
          {unreadNotificationCount > 0 ? (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unreadNotificationCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Instant Roommate Perspective Switcher (Ayush / Yuvraj / Vansh) */}
      <View style={styles.switcherRow}>
        <Text style={styles.switcherLabel}>Viewing as:</Text>
        <View style={styles.switcherPills}>
          {(['user-ayush', 'user-yuvraj', 'user-vansh'] as const).map((uid) => {
            const label = uid === 'user-ayush' ? 'Ayush' : uid === 'user-yuvraj' ? 'Yuvraj' : 'Vansh';
            return (
              <MemberPill
                key={uid}
                name={label}
                selected={currentUser.id === uid}
                onPress={() => signInAsRoommate(uid)}
              />
            );
          })}
        </View>
      </View>

      {/* 1. My Spending This Month + 2. My Net Balance Hero Card */}
      <GlassCard variant="elevated" style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <AmountDisplay
              label="My Spending This Month"
              paise={paidThisMonthPaise}
              size="hero"
              tone="brand"
              sublabel="Total amount paid by me (not my final share of all flat expenses)"
            />
          </View>
          <StatusChip
            label={
              netPaise > 0
                ? `You are owed ${formatINR(netPaise)}`
                : netPaise < 0
                ? `You owe ${formatINR(Math.abs(netPaise))}`
                : 'All Settled'
            }
            tone={netPaise > 0 ? 'positive' : netPaise < 0 ? 'negative' : 'neutral'}
            icon={
              netPaise > 0
                ? 'trending-up-outline'
                : netPaise < 0
                ? 'trending-down-outline'
                : 'checkmark-circle-outline'
            }
          />
        </View>

        <View style={styles.balanceSplitGrid}>
          <View style={[styles.balanceMiniBox, styles.boxNegative]}>
            <Text style={styles.miniLabel}>I NEED TO PAY OTHERS</Text>
            <AmountDisplay paise={owedByMePaise} size="md" tone="negative" />
          </View>
          <View style={[styles.balanceMiniBox, styles.boxPositive]}>
            <Text style={styles.miniLabel}>OTHERS NEED TO PAY ME</Text>
            <AmountDisplay paise={owedToMePaise} size="md" tone="positive" />
          </View>
          <View style={[styles.balanceMiniBox, styles.boxNeutral]}>
            <Text style={styles.miniLabel}>NET BALANCE</Text>
            <AmountDisplay
              paise={netPaise}
              size="md"
              tone={netPaise > 0 ? 'positive' : netPaise < 0 ? 'negative' : 'default'}
              showSign
            />
          </View>
        </View>

        {/* Pairwise Who Owes Whom Explanation */}
        {myBalance && myBalance.pairwiseDebts.length > 0 ? (
          <View style={styles.pairwiseSection}>
            <Text style={styles.pairwiseHeader}>Balance Breakdown:</Text>
            {myBalance.pairwiseDebts.map((debt) => {
              const iOwe = debt.fromUserId === currentUser.id;
              const otherName = getMemberName(iOwe ? debt.toUserId : debt.fromUserId);
              return (
                <View key={`${debt.fromUserId}-${debt.toUserId}`} style={styles.pairwiseRow}>
                  <MemberAvatar name={otherName} size={26} />
                  <Text style={styles.pairwiseText}>
                    {iOwe
                      ? `You owe ${otherName}`
                      : `${otherName} owes you`}
                  </Text>
                  <Text
                    style={[
                      styles.pairwiseAmount,
                      { color: iOwe ? Colors.semantic.negative : Colors.semantic.positive },
                    ]}
                  >
                    {formatINR(debt.amountPaise)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </GlassCard>

      {/* 3. Quick Actions Row */}
      <View style={styles.quickActionsGrid}>
        <Pressable
          onPress={() => router.push('/(tabs)/expenses')}
          style={styles.quickActionCard}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: Colors.brand.primarySoft }]}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.brand.primary} />
          </View>
          <Text style={styles.quickActionTitle}>Add Expense</Text>
          <Text style={styles.quickActionSub}>Split bill</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/food')}
          style={styles.quickActionCard}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: Colors.semantic.positiveBg }]}>
            <Ionicons name="restaurant-outline" size={20} color={Colors.semantic.positive} />
          </View>
          <Text style={styles.quickActionTitle}>My Meals</Text>
          <Text style={styles.quickActionSub}>Lunch / Dinner</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/payments')}
          style={styles.quickActionCard}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: Colors.brand.indigoSoft }]}>
            <Ionicons name="paper-plane-outline" size={20} color={Colors.brand.indigo} />
          </View>
          <Text style={styles.quickActionTitle}>Pay Roommate</Text>
          <Text style={styles.quickActionSub}>Attach proof</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/food')}
          style={styles.quickActionCard}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: Colors.semantic.warningBg }]}>
            <Ionicons name="calendar-outline" size={20} color={Colors.semantic.warning} />
          </View>
          <Text style={styles.quickActionTitle}>Food Cycle</Text>
          <Text style={styles.quickActionSub}>Settle {activeHousehold.foodProviderName}</Text>
        </Pressable>
      </View>

      {/* 4. Food Status Card (Settlement-Based Cycle, Separate from Normal Monthly Bills) */}
      <GlassCard variant="highlight" style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionOverline}>
              CURRENT FOOD CYCLE • VENDOR: {activeHousehold.foodProviderName.toUpperCase()}
            </Text>
            <Text style={styles.sectionTitle}>
              Started {activeFoodCycle?.startDate ?? 'Today'}
            </Text>
          </View>
          <StatusChip
            label={`${activeFoodCycleSummary?.totalMealsCount ?? 0} Meals`}
            tone="info"
            icon="fast-food-outline"
          />
        </View>

        <View style={styles.foodStatsRow}>
          <View style={{ flex: 1 }}>
            <AmountDisplay
              label="Outstanding Food Bill"
              paise={activeFoodCycleSummary?.outstandingAmountPaise ?? 0}
              size="lg"
              tone="brand"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AmountDisplay
              label={`${currentUser.fullName}'s Cycle Meals`}
              paise={myMealStats?.totalChargePaise ?? 0}
              size="md"
              sublabel={`${myMealStats?.lunchCount ?? 0} Lunch • ${myMealStats?.dinnerCount ?? 0} Dinner`}
            />
          </View>
        </View>

        <Text style={styles.foodCycleDisclaimer}>
          Tracked per settlement cycle — accumulates until {activeHousehold.foodProviderName} requests payment.
        </Text>

        <View style={styles.foodButtonRow}>
          <GlassButton
            title="Update Today's Meal"
            size="sm"
            icon="checkmark-done-outline"
            onPress={() => router.push('/(tabs)/food')}
          />
          <GlassButton
            title="Settle Food Bill"
            size="sm"
            variant="secondary"
            icon="wallet-outline"
            onPress={() => router.push('/(tabs)/food')}
          />
        </View>
      </GlassCard>

      {/* 5. Recent Household Activity */}
      <GlassCard style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Recent Household Activity</Text>
          <Pressable onPress={() => router.push('/(tabs)/activity')}>
            <Text style={styles.linkText}>View All</Text>
          </Pressable>
        </View>

        {activityLogs.length === 0 ? (
          <EmptyState
            title="No Recent Activity"
            message="Added expenses, meal updates, and repayments will appear here."
          />
        ) : (
          activityLogs.slice(0, 5).map((log, index) => {
            const actorName = getMemberName(log.actorUserId);
            const affectsMe = log.affectedUserIds.includes(currentUser.id);
            return (
              <ListRow
                key={log.id}
                title={log.summary}
                subtitle={`${actorName} • ${new Date(log.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}`}
                meta={affectsMe ? 'Affects your household record' : 'Other members only'}
                leftElement={<MemberAvatar name={actorName} size={36} />}
                rightElement={
                  log.amountPaise ? (
                    <AmountDisplay
                      paise={log.amountPaise}
                      size="sm"
                      tone={affectsMe ? 'brand' : 'default'}
                    />
                  ) : undefined
                }
                showDivider={index < Math.min(activityLogs.length, 5) - 1}
              />
            );
          })
        )}
      </GlassCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  flatBadge: {
    ...Typography.overline,
    color: Colors.brand.primary,
  },
  welcomeTitle: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginTop: 2,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.glass.cardElevated,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.semantic.negative,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  switcherRow: {
    marginBottom: Spacing.sm,
  },
  switcherLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.muted,
    marginBottom: 6,
  },
  switcherPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  heroCard: {
    marginBottom: Spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: Spacing.md,
  },
  balanceSplitGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  balanceMiniBox: {
    flex: 1,
    padding: 10,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  boxNegative: {
    backgroundColor: Colors.semantic.negativeBg,
    borderColor: Colors.semantic.negativeBorder,
  },
  boxPositive: {
    backgroundColor: Colors.semantic.positiveBg,
    borderColor: Colors.semantic.positiveBorder,
  },
  boxNeutral: {
    backgroundColor: Colors.glass.cardSubtle,
    borderColor: Colors.glass.borderSubtle,
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.text.secondary,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  pairwiseSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.glass.borderSubtle,
  },
  pairwiseHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  pairwiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  pairwiseText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  pairwiseAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.glass.cardElevated,
    borderRadius: Radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  quickActionSub: {
    fontSize: 10,
    color: Colors.text.muted,
    marginTop: 1,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionOverline: {
    ...Typography.overline,
    color: Colors.brand.primary,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  foodStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
    gap: 12,
  },
  foodCycleDisclaimer: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 6,
    marginBottom: Spacing.sm,
  },
  foodButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand.primary,
  },
});
