import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import { calculateFoodCycleSummary, calculateHouseholdBalances } from '../src/utils/finance';

describe('Phase 5: Dashboard UI & Live Household Summary Calculations', () => {
  it('distinguishes monthly spending paid by user from net balance owed/receivable', () => {
    const testDb = new RoomSyncDatabase();
    const snap = testDb.getSnapshot();
    const memberIds = ['user-ayush', 'user-yuvraj', 'user-vansh'];

    const balances = calculateHouseholdBalances({
      memberUserIds: memberIds,
      expenses: snap.expenses,
      payments: snap.payments,
    });

    // Ayush paid ₹900 (90000 paise) this month; net owed to Ayush is ₹400 (40000 paise)
    expect(balances['user-ayush'].totalPaidThisMonthPaise).toBe(90000);
    expect(balances['user-ayush'].netBalancePaise).toBe(40000);

    // Yuvraj paid ₹600 (60000 paise) this month; net owed to Yuvraj is ₹100 (10000 paise)
    expect(balances['user-yuvraj'].totalPaidThisMonthPaise).toBe(60000);
    expect(balances['user-yuvraj'].netBalancePaise).toBe(10000);

    // Vansh paid ₹0 this month; Vansh owes ₹500 (50000 paise)
    expect(balances['user-vansh'].totalPaidThisMonthPaise).toBe(0);
    expect(balances['user-vansh'].totalOwedByMePaise).toBe(50000);
    expect(balances['user-vansh'].netBalancePaise).toBe(-50000);
  });

  it('computes live food cycle summary for the dashboard card', () => {
    const testDb = new RoomSyncDatabase();
    const snap = testDb.getSnapshot();
    const cycle = snap.foodCycles[0];

    const summary = calculateFoodCycleSummary(
      cycle,
      snap.mealEntries,
      snap.foodSettlements,
      ['user-ayush', 'user-yuvraj', 'user-vansh']
    );

    expect(summary.totalMealsCount).toBe(6);
    expect(summary.totalAmountPaise).toBe(48000); // 6 meals * ₹80
    expect(summary.outstandingAmountPaise).toBe(48000);
    expect(summary.memberBreakdown['user-ayush'].totalChargePaise).toBe(16000);
  });
});
