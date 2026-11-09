import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import {
  calculateEqualSplits,
  calculateHouseholdBalances,
  validateSplitsExactSum,
} from '../src/utils/finance';

describe('Phase 3: Backend Foundation, Financial Rules & RLS Isolation', () => {
  it('allocates remainder paise deterministically so equal splits sum exactly to amountPaise', () => {
    // ₹100.00 (10000 paise) split across 3 members -> 3334 + 3333 + 3333 = 10000 paise
    const splits = calculateEqualSplits(10000, ['user-vansh', 'user-ayush', 'user-yuvraj']);
    expect(splits.length).toBe(3);
    expect(validateSplitsExactSum(10000, splits)).toBe(true);
    expect(splits.map((s) => s.sharePaise)).toEqual([3334, 3333, 3333]);
  });

  it('enforces household Row-Level Security (RLS) so outsiders cannot access flat data', () => {
    const testDb = new RoomSyncDatabase();
    const outsider = testDb.registerOrLoginUser({
      email: 'outsider@otherflat.com',
      fullName: 'Outsider',
    });

    expect(() => testDb.getExpenses(outsider.id, 'household-flat-1')).toThrow(
      /RLS Access Denied/
    );
  });

  it('derives accurate roommate balances from Yuvraj ₹600 and Ayush ₹900 seeded expenses', () => {
    const testDb = new RoomSyncDatabase();
    const snap = testDb.getSnapshot();
    const balances = calculateHouseholdBalances({
      memberUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      expenses: snap.expenses,
      payments: snap.payments,
    });

    // Yuvraj paid 60000 (20000 each); Ayush paid 90000 (30000 each)
    // Net for Ayush: paid 90000, share 50000 -> +40000 (+₹400 owed to Ayush)
    // Net for Yuvraj: paid 60000, share 50000 -> +10000 (+₹100 owed to Yuvraj)
    // Net for Vansh: paid 0, share 50000 -> -50000 (Vansh owes ₹500 total)
    expect(balances['user-ayush'].netBalancePaise).toBe(40000);
    expect(balances['user-yuvraj'].netBalancePaise).toBe(10000);
    expect(balances['user-vansh'].netBalancePaise).toBe(-50000);
  });
});
