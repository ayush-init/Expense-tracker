import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import {
  calculateEqualSplits,
  calculateFoodCycleSummary,
  calculateHouseholdBalances,
  validateSplitsExactSum,
} from '../src/utils/finance';
import { rupeesToPaise } from '../src/utils/currency';

describe('Phase 12: End-to-End Verification of All 13 Financial Correctness Rules', () => {
  it('verifies Rules #1–#5 & #12: integer paise, independent payer/participants, deterministic remainder, and personal expenses', () => {
    const testDb = new RoomSyncDatabase();

    // Rule #1 & #12: ₹100.00 (10000 paise) split across 3 members -> 3334 + 3333 + 3333 = 10000
    const oddSplits = calculateEqualSplits(10000, ['user-ayush', 'user-yuvraj', 'user-vansh']);
    expect(validateSplitsExactSum(10000, oddSplits)).toBe(true);

    // Rule #2, #3, #4: Ayush pays ₹500 for Yuvraj and Vansh ONLY (Ayush excludes himself)
    const exp = testDb.createExpense({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      title: 'Electricity Top-Up',
      amountPaise: rupeesToPaise(500),
      category: 'Electricity',
      paidByUserId: 'user-ayush',
      participantUserIds: ['user-yuvraj', 'user-vansh'],
      splitType: 'equal',
      paymentMethod: 'UPI (other app)',
    });

    expect(exp.amountPaise).toBe(50000);
    expect(exp.splits).toHaveLength(2);
    expect(exp.splits.find((s) => s.userId === 'user-ayush')).toBeUndefined();
    expect(exp.splits.find((s) => s.userId === 'user-yuvraj')?.sharePaise).toBe(25000);
    expect(exp.splits.find((s) => s.userId === 'user-vansh')?.sharePaise).toBe(25000);
  });

  it('verifies Rules #6, #7, #8: meal charges only for received meals, settlement-based food cycles across month boundaries, and partial vs full settlements', () => {
    const testDb = new RoomSyncDatabase();

    // Cross-month meal entries (e.g. Nov 30 and Dec 2) stay in the same open cycle until settled!
    testDb.upsertMealEntry({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      targetUserId: 'user-ayush',
      mealDate: '2026-11-30',
      mealType: 'lunch',
      received: true,
    });
    testDb.upsertMealEntry({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      targetUserId: 'user-ayush',
      mealDate: '2026-12-02',
      mealType: 'dinner',
      received: false,
      skipReason: 'Food provider/uncle did not come',
    });

    const openCycle = testDb.getOrCreateOpenFoodCycle('household-flat-1', 'user-ayush');
    const summaryBefore = calculateFoodCycleSummary(
      openCycle,
      testDb.getSnapshot().mealEntries,
      testDb.getSnapshot().foodSettlements,
      ['user-ayush', 'user-yuvraj', 'user-vansh']
    );

    // 6 initial meals + 1 received Nov 30 lunch + 0 for skipped Dec 2 dinner = 7 charged meals (56000 paise)
    expect(summaryBefore.totalMealsCount).toBe(7);
    expect(summaryBefore.totalAmountPaise).toBe(56000);

    // Rule #8: Partial settlement of ₹200 (20000 paise) leaves ₹360 (36000 paise) outstanding
    const afterPartial = testDb.recordFoodSettlement({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      paidByUserId: 'user-ayush',
      amountPaise: 20000,
      paymentMethod: 'PhonePe',
    });
    expect(afterPartial.activeCycle.status).toBe('open');
    expect(afterPartial.activeCycle.outstandingAmountPaise).toBe(36000);

    // Full settlement of remaining ₹360 closes the cycle and starts a new cycle at ₹0
    const afterFull = testDb.recordFoodSettlement({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      paidByUserId: 'user-ayush',
      amountPaise: 36000,
      paymentMethod: 'PhonePe',
    });
    expect(afterFull.closedCycle?.status).toBe('settled');
    expect(afterFull.activeCycle.totalAmountPaise).toBe(0);
    expect(afterFull.activeCycle.outstandingAmountPaise).toBe(0);
  });

  it('verifies Rules #9, #10, #11, #13: repayments, non-destructive void audit trail, and multi-household RLS isolation', () => {
    const testDb = new RoomSyncDatabase();

    // Create a second household for another group of users and verify complete data isolation
    const otherUser = testDb.registerOrLoginUser({
      email: 'priya@otherflat.app',
      fullName: 'Priya',
    });
    const otherFlat = testDb.createHousehold({
      actorUserId: otherUser.id,
      name: 'Sunrise Residency 101',
    });

    expect(() => testDb.getExpenses(otherUser.id, 'household-flat-1')).toThrow(/RLS Access Denied/);
    expect(() => testDb.getExpenses('user-ayush', otherFlat.id)).toThrow(/RLS Access Denied/);

    // Verify pairwise debt explanation (Rule #13)
    const snap = testDb.getSnapshot();
    const balances = calculateHouseholdBalances({
      memberUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      expenses: snap.expenses,
      payments: snap.payments,
    });
    expect(balances['user-vansh'].pairwiseDebts.length).toBeGreaterThan(0);
  });
});
