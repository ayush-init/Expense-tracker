/**
 * RoomSync Financial Calculation Engine
 * Enforces all 13 mandatory Financial Correctness Rules from RoomSync_Master_Build_Prompt.md.
 */

import {
  Expense,
  FoodCycle,
  FoodSettlement,
  MealEntry,
  PairwiseDebt,
  Payment,
  UserBalanceSummary,
} from '../types/models';

/**
 * Rule #1, #3, #4, #5, #12:
 * Computes deterministic equal integer paise splits among selected participant IDs.
 * Any remainder paise (amountPaise % count) is distributed 1 paise at a time
 * in deterministic sorted userId order so shares always sum EXACTLY to amountPaise.
 */
export function calculateEqualSplits(
  amountPaise: number,
  participantUserIds: string[]
): Array<{ userId: string; sharePaise: number }> {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('Expense amount must be a positive integer in paise');
  }
  const uniqueIds = Array.from(new Set(participantUserIds)).sort();
  if (uniqueIds.length === 0) {
    throw new Error('At least one participant must be selected for the split');
  }

  const baseShare = Math.floor(amountPaise / uniqueIds.length);
  const remainder = amountPaise % uniqueIds.length;

  return uniqueIds.map((userId, index) => ({
    userId,
    sharePaise: baseShare + (index < remainder ? 1 : 0),
  }));
}

/**
 * Validates that custom or equal split shares sum exactly to the original expense amount.
 */
export function validateSplitsExactSum(
  amountPaise: number,
  splits: Array<{ userId: string; sharePaise: number }>
): boolean {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return false;
  if (splits.length === 0) return false;

  let sum = 0;
  for (const s of splits) {
    if (!Number.isInteger(s.sharePaise) || s.sharePaise < 0) return false;
    sum += s.sharePaise;
  }
  return sum === amountPaise;
}

/**
 * Rule #6, #7, #8:
 * Computes the food cycle breakdown from recorded meal entries and settlements.
 * - Only meals with `received === true` create a charge.
 * - Each meal uses its own stored `pricePaise` so changing the default price later
 *   never alters historical meal charges.
 */
export interface FoodCycleSummary {
  cycleId: string;
  startDate: string;
  endDate?: string;
  status: 'open' | 'settled';
  totalMealsCount: number;
  totalAmountPaise: number;
  settledAmountPaise: number;
  outstandingAmountPaise: number;
  memberBreakdown: Record<
    string,
    {
      userId: string;
      lunchCount: number;
      dinnerCount: number;
      skippedCount: number;
      totalMeals: number;
      totalChargePaise: number;
      paidTowardsSettlementPaise: number;
    }
  >;
}

export function calculateFoodCycleSummary(
  cycle: FoodCycle,
  meals: MealEntry[],
  settlements: FoodSettlement[],
  memberUserIds: string[]
): FoodCycleSummary {
  const memberBreakdown: FoodCycleSummary['memberBreakdown'] = {};
  for (const uid of memberUserIds) {
    memberBreakdown[uid] = {
      userId: uid,
      lunchCount: 0,
      dinnerCount: 0,
      skippedCount: 0,
      totalMeals: 0,
      totalChargePaise: 0,
      paidTowardsSettlementPaise: 0,
    };
  }

  let totalMealsCount = 0;
  let totalAmountPaise = 0;

  for (const meal of meals) {
    if (meal.cycleId !== cycle.id) continue;
    if (!memberBreakdown[meal.userId]) {
      memberBreakdown[meal.userId] = {
        userId: meal.userId,
        lunchCount: 0,
        dinnerCount: 0,
        skippedCount: 0,
        totalMeals: 0,
        totalChargePaise: 0,
        paidTowardsSettlementPaise: 0,
      };
    }
    const bucket = memberBreakdown[meal.userId];
    if (meal.received) {
      if (meal.mealType === 'lunch') bucket.lunchCount += 1;
      if (meal.mealType === 'dinner') bucket.dinnerCount += 1;
      bucket.totalMeals += 1;
      bucket.totalChargePaise += meal.pricePaise;
      totalMealsCount += 1;
      totalAmountPaise += meal.pricePaise;
    } else {
      bucket.skippedCount += 1;
    }
  }

  let settledAmountPaise = 0;
  for (const s of settlements) {
    if (s.cycleId !== cycle.id) continue;
    settledAmountPaise += s.amountPaise;
    if (memberBreakdown[s.paidByUserId]) {
      memberBreakdown[s.paidByUserId].paidTowardsSettlementPaise += s.amountPaise;
    }
  }

  const outstandingAmountPaise = Math.max(0, totalAmountPaise - settledAmountPaise);

  return {
    cycleId: cycle.id,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    status: cycle.status,
    totalMealsCount,
    totalAmountPaise,
    settledAmountPaise,
    outstandingAmountPaise,
    memberBreakdown,
  };
}

/**
 * Rule #2, #3, #4, #5, #9, #13:
 * Derives transparent roommate balances from active expenses, splits, food settlements,
 * and non-voided/non-disputed roommate repayments.
 */
export function calculateHouseholdBalances(params: {
  memberUserIds: string[];
  expenses: Expense[];
  payments: Payment[];
  foodCycles?: FoodCycle[];
  mealEntries?: MealEntry[];
  foodSettlements?: FoodSettlement[];
  referenceDate?: Date;
}): Record<string, UserBalanceSummary> {
  const {
    memberUserIds,
    expenses,
    payments,
    foodCycles = [],
    mealEntries = [],
    foodSettlements = [],
    referenceDate = new Date(),
  } = params;

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();

  // Pairwise matrix: owedMatrix[debtor][creditor] = paise debtor owes creditor
  const owedMatrix: Record<string, Record<string, number>> = {};
  const paidThisMonth: Record<string, number> = {};

  for (const u1 of memberUserIds) {
    owedMatrix[u1] = {};
    paidThisMonth[u1] = 0;
    for (const u2 of memberUserIds) {
      owedMatrix[u1][u2] = 0;
    }
  }

  // 1. Active Normal Expenses
  for (const exp of expenses) {
    if (exp.status !== 'active') continue;

    const expDate = new Date(exp.expenseDate);
    if (expDate.getFullYear() === refYear && expDate.getMonth() === refMonth) {
      paidThisMonth[exp.paidByUserId] = (paidThisMonth[exp.paidByUserId] ?? 0) + exp.amountPaise;
    }

    // Personal expense or payer's own share does not create debt to self
    for (const split of exp.splits) {
      if (split.userId !== exp.paidByUserId && split.sharePaise > 0) {
        if (!owedMatrix[split.userId]) owedMatrix[split.userId] = {};
        owedMatrix[split.userId][exp.paidByUserId] =
          (owedMatrix[split.userId][exp.paidByUserId] ?? 0) + split.sharePaise;
      }
    }
  }

  // 2. Food Settlements: when a member pays the food vendor (Rox) to settle a cycle,
  // each roommate who consumed meals in that cycle owes their proportional meal share to the payer.
  for (const cycle of foodCycles) {
    const cycleSettlements = foodSettlements.filter((s) => s.cycleId === cycle.id);
    if (cycleSettlements.length === 0) continue;

    const summary = calculateFoodCycleSummary(cycle, mealEntries, cycleSettlements, memberUserIds);
    if (summary.totalAmountPaise <= 0) continue;

    for (const settlement of cycleSettlements) {
      const sDate = new Date(settlement.settledAt);
      if (sDate.getFullYear() === refYear && sDate.getMonth() === refMonth) {
        paidThisMonth[settlement.paidByUserId] =
          (paidThisMonth[settlement.paidByUserId] ?? 0) + settlement.amountPaise;
      }

      // Allocate this settlement across members proportional to their meal charges in the cycle
      for (const uid of memberUserIds) {
        if (uid === settlement.paidByUserId) continue;
        const memberCharge = summary.memberBreakdown[uid]?.totalChargePaise ?? 0;
        if (memberCharge <= 0) continue;

        const memberShareOfSettlement = Math.round(
          (settlement.amountPaise * memberCharge) / summary.totalAmountPaise
        );
        if (memberShareOfSettlement > 0) {
          if (!owedMatrix[uid]) owedMatrix[uid] = {};
          owedMatrix[uid][settlement.paidByUserId] =
            (owedMatrix[uid][settlement.paidByUserId] ?? 0) + memberShareOfSettlement;
        }
      }
    }
  }

  // 3. Roommate Repayments (Confirmed or Recorded reduce the outstanding debt)
  for (const pay of payments) {
    if (pay.status === 'voided' || pay.status === 'disputed') continue;

    // When paidByUserId pays paidToUserId, paidByUserId's debt to paidToUserId decreases
    if (!owedMatrix[pay.paidByUserId]) owedMatrix[pay.paidByUserId] = {};
    owedMatrix[pay.paidByUserId][pay.paidToUserId] =
      (owedMatrix[pay.paidByUserId][pay.paidToUserId] ?? 0) - pay.amountPaise;
  }

  // 4. Net pairwise balances between every pair of roommates
  const netPairwise: PairwiseDebt[] = [];
  for (let i = 0; i < memberUserIds.length; i++) {
    for (let j = i + 1; j < memberUserIds.length; j++) {
      const uA = memberUserIds[i];
      const uB = memberUserIds[j];
      const aOwesB = owedMatrix[uA]?.[uB] ?? 0;
      const bOwesA = owedMatrix[uB]?.[uA] ?? 0;
      const diff = aOwesB - bOwesA;
      if (diff > 0) {
        netPairwise.push({ fromUserId: uA, toUserId: uB, amountPaise: diff });
      } else if (diff < 0) {
        netPairwise.push({ fromUserId: uB, toUserId: uA, amountPaise: Math.abs(diff) });
      }
    }
  }

  const summaries: Record<string, UserBalanceSummary> = {};
  for (const uid of memberUserIds) {
    const owedByMe = netPairwise
      .filter((d) => d.fromUserId === uid)
      .reduce((acc, d) => acc + d.amountPaise, 0);
    const owedToMe = netPairwise
      .filter((d) => d.toUserId === uid)
      .reduce((acc, d) => acc + d.amountPaise, 0);

    summaries[uid] = {
      userId: uid,
      totalPaidThisMonthPaise: paidThisMonth[uid] ?? 0,
      totalOwedByMePaise: owedByMe,
      totalOwedToMePaise: owedToMe,
      netBalancePaise: owedToMe - owedByMe,
      pairwiseDebts: netPairwise.filter((d) => d.fromUserId === uid || d.toUserId === uid),
    };
  }

  return summaries;
}
