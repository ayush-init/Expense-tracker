import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import { calculateHouseholdBalances } from '../src/utils/finance';

describe('Phase 6: Normal Household Expenses & Member-Wise Splitting', () => {
  it('supports Yuvraj adding ₹600 shared only with Ayush & Vansh and notifies only affected members', () => {
    const testDb = new RoomSyncDatabase();
    const initialNotifCount = testDb.getSnapshot().notifications.length;

    const expense = testDb.createExpense({
      actorUserId: 'user-yuvraj',
      householdId: 'household-flat-1',
      title: 'Snacks & Beverages',
      amountPaise: 60000, // ₹600
      category: 'Snacks',
      paidByUserId: 'user-yuvraj',
      participantUserIds: ['user-ayush', 'user-vansh'], // Yuvraj excludes himself
      splitType: 'equal',
      paymentMethod: 'PhonePe',
    });

    expect(expense.splits.length).toBe(2);
    expect(expense.splits.find((s) => s.userId === 'user-ayush')?.sharePaise).toBe(30000);
    expect(expense.splits.find((s) => s.userId === 'user-vansh')?.sharePaise).toBe(30000);
    expect(expense.splits.find((s) => s.userId === 'user-yuvraj')).toBeUndefined();

    // Only Ayush and Vansh should receive new notifications
    const newNotifs = testDb
      .getSnapshot()
      .notifications.slice(0, testDb.getSnapshot().notifications.length - initialNotifCount);
    expect(newNotifs.map((n) => n.recipientUserId).sort()).toEqual(['user-ayush', 'user-vansh']);
  });

  it('supports personal expenses without affecting other roommates balances', () => {
    const testDb = new RoomSyncDatabase();
    const before = calculateHouseholdBalances({
      memberUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      expenses: testDb.getSnapshot().expenses,
      payments: [],
    });

    testDb.createExpense({
      actorUserId: 'user-vansh',
      householdId: 'household-flat-1',
      title: 'Personal Headphones',
      amountPaise: 150000, // ₹1,500
      category: 'Other purchases',
      paidByUserId: 'user-vansh',
      participantUserIds: ['user-vansh'],
      splitType: 'personal',
      paymentMethod: 'Card',
    });

    const after = calculateHouseholdBalances({
      memberUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      expenses: testDb.getSnapshot().expenses,
      payments: [],
    });

    // Personal expense increases Vansh's "paid this month" but does NOT alter anyone's net balance
    expect(after['user-vansh'].totalPaidThisMonthPaise).toBe(
      before['user-vansh'].totalPaidThisMonthPaise + 150000
    );
    expect(after['user-ayush'].netBalancePaise).toBe(before['user-ayush'].netBalancePaise);
    expect(after['user-yuvraj'].netBalancePaise).toBe(before['user-yuvraj'].netBalancePaise);
    expect(after['user-vansh'].netBalancePaise).toBe(before['user-vansh'].netBalancePaise);
  });

  it('requires a reason to void an expense and preserves audit history', () => {
    const testDb = new RoomSyncDatabase();
    expect(() =>
      testDb.voidExpense({
        actorUserId: 'user-ayush',
        householdId: 'household-flat-1',
        expenseId: 'exp-seed-1',
        reason: '   ',
      })
    ).toThrow(/reason is required/);

    const voided = testDb.voidExpense({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      expenseId: 'exp-seed-1',
      reason: 'Entered duplicate grocery bill',
    });
    expect(voided.status).toBe('voided');
    expect(voided.voidReason).toBe('Entered duplicate grocery bill');
  });
});
