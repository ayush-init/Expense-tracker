import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import { calculateFoodCycleSummary } from '../src/utils/finance';

describe('Phase 7: Personal Food Calendar & Meal Tracking', () => {
  it('allows Ayush to uncheck his own meal with a reason without altering Yuvraj or Vansh meals', () => {
    const testDb = new RoomSyncDatabase();
    const snap = testDb.getSnapshot();
    const cycle = snap.foodCycles[0];
    const today = snap.mealEntries[0].mealDate;

    // Ayush marks his dinner as skipped because "I did not eat"
    const updated = testDb.upsertMealEntry({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      targetUserId: 'user-ayush',
      mealDate: today,
      mealType: 'dinner',
      received: false,
      skipReason: 'I did not eat',
      note: 'Had dinner at a family event',
    });

    expect(updated.received).toBe(false);
    expect(updated.skipReason).toBe('I did not eat');

    const summary = calculateFoodCycleSummary(
      cycle,
      snap.mealEntries,
      snap.foodSettlements,
      ['user-ayush', 'user-yuvraj', 'user-vansh']
    );

    // Ayush now has 1 lunch (₹80) and 1 skipped dinner (₹0) -> ₹80 (8000 paise)
    // Yuvraj and Vansh remain untouched at 2 meals (₹160 = 16000 paise) each
    expect(summary.memberBreakdown['user-ayush'].totalChargePaise).toBe(8000);
    expect(summary.memberBreakdown['user-ayush'].skippedCount).toBe(1);
    expect(summary.memberBreakdown['user-yuvraj'].totalChargePaise).toBe(16000);
    expect(summary.memberBreakdown['user-vansh'].totalChargePaise).toBe(16000);
    expect(summary.totalAmountPaise).toBe(40000);
  });

  it('prevents a non-admin member from modifying another roommate meal entry', () => {
    const testDb = new RoomSyncDatabase();
    expect(() =>
      testDb.upsertMealEntry({
        actorUserId: 'user-yuvraj', // Yuvraj is a regular member
        householdId: 'household-flat-1',
        targetUserId: 'user-vansh',
        mealDate: '2026-11-10',
        mealType: 'lunch',
        received: false,
        skipReason: 'I did not eat',
      })
    ).toThrow(/Only the meal owner or a household admin/);
  });

  it('preserves historical meal prices when the household default meal price changes later', () => {
    const testDb = new RoomSyncDatabase();
    const beforeTotal = testDb.getSnapshot().foodCycles[0].totalAmountPaise;
    expect(beforeTotal).toBe(48000); // 6 meals @ ₹80

    // Admin Ayush updates default meal price from ₹80 (8000) to ₹100 (10000)
    testDb.updateHouseholdSettings({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      defaultMealPricePaise: 10000,
    });

    // Historical 6 meals remain at ₹80 (48000 paise); a new meal on another date uses ₹100 (10000 paise)
    const newMeal = testDb.upsertMealEntry({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      targetUserId: 'user-ayush',
      mealDate: '2026-11-15',
      mealType: 'lunch',
      received: true,
    });
    expect(newMeal.pricePaise).toBe(10000);
    expect(testDb.getSnapshot().foodCycles[0].totalAmountPaise).toBe(58000);
  });
});
