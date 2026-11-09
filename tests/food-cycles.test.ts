import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import { calculateHouseholdBalances } from '../src/utils/finance';

describe('Phase 8: Settlement-Based Food Cycles & Full/Partial Settlements', () => {
  it('reduces outstanding balance on partial food settlement without closing the current cycle', () => {
    const testDb = new RoomSyncDatabase();
    // Seed cycle has 6 meals @ ₹80 = ₹480 (48000 paise)
    const partialResult = testDb.recordFoodSettlement({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      paidByUserId: 'user-ayush',
      amountPaise: 18000, // Partial payment of ₹180
      paymentMethod: 'Google Pay (GPay)',
      note: 'Advance paid to Rox uncle',
    });

    expect(partialResult.settlement.settlementType).toBe('partial');
    expect(partialResult.closedCycle).toBeUndefined();
    expect(partialResult.activeCycle.status).toBe('open');
    expect(partialResult.activeCycle.totalAmountPaise).toBe(48000);
    expect(partialResult.activeCycle.settledAmountPaise).toBe(18000);
    expect(partialResult.activeCycle.outstandingAmountPaise).toBe(30000); // ₹300 still outstanding
  });

  it('closes the old cycle, preserves history, and starts a new ₹0 cycle on full settlement', () => {
    const testDb = new RoomSyncDatabase();
    const initialCycleId = testDb.getSnapshot().foodCycles[0].id;

    const fullResult = testDb.recordFoodSettlement({
      actorUserId: 'user-yuvraj',
      householdId: 'household-flat-1',
      paidByUserId: 'user-yuvraj',
      amountPaise: 48000, // Full ₹480 settlement
      paymentMethod: 'PhonePe',
      settlementDate: '2026-11-12',
    });

    expect(fullResult.settlement.settlementType).toBe('full');
    expect(fullResult.closedCycle?.id).toBe(initialCycleId);
    expect(fullResult.closedCycle?.status).toBe('settled');
    expect(fullResult.closedCycle?.endDate).toBe('2026-11-12');
    expect(fullResult.closedCycle?.outstandingAmountPaise).toBe(0);

    // A brand-new cycle starts at ₹0
    expect(fullResult.activeCycle.id).not.toBe(initialCycleId);
    expect(fullResult.activeCycle.status).toBe('open');
    expect(fullResult.activeCycle.totalAmountPaise).toBe(0);
    expect(fullResult.activeCycle.outstandingAmountPaise).toBe(0);

    // Old meal records remain preserved in history
    const oldMeals = testDb
      .getSnapshot()
      .mealEntries.filter((m) => m.cycleId === initialCycleId);
    expect(oldMeals.length).toBe(6);

    // Balances reflect that Yuvraj paid ₹480 for the flat's food (₹160 per member)
    const snap = testDb.getSnapshot();
    const balances = calculateHouseholdBalances({
      memberUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      expenses: snap.expenses,
      payments: snap.payments,
      foodCycles: snap.foodCycles,
      mealEntries: snap.mealEntries,
      foodSettlements: snap.foodSettlements,
    });
    // Previously Yuvraj was +10000; now Ayush (+16000) and Vansh (+16000) owe Yuvraj -> +42000
    expect(balances['user-yuvraj'].netBalancePaise).toBe(42000);
  });
});
