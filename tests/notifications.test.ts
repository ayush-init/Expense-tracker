import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import { NotificationService } from '../src/services/notificationService';

describe('Phase 10: Activity Feed, Targeted Notifications & Deduplication', () => {
  it('delivers notifications only to affected roommates and prevents duplicate push dispatches', () => {
    const testDb = new RoomSyncDatabase();
    const notifService = new NotificationService(testDb);

    // Yuvraj adds an expense shared only between Yuvraj and Ayush (Vansh is NOT included)
    const exp = testDb.createExpense({
      actorUserId: 'user-yuvraj',
      householdId: 'household-flat-1',
      title: 'Late Night Coffee',
      amountPaise: 24000, // ₹240
      category: 'Snacks',
      paidByUserId: 'user-yuvraj',
      participantUserIds: ['user-yuvraj', 'user-ayush'],
      splitType: 'equal',
      paymentMethod: 'Google Pay (GPay)',
    });

    const ayushNotifs = notifService.getDeliverableNotificationsForUser(
      'household-flat-1',
      'user-ayush'
    );
    const vanshNotifs = notifService.getDeliverableNotificationsForUser(
      'household-flat-1',
      'user-vansh'
    );

    const addedForAyush = ayushNotifs.find((n) => n.relatedEntityId === exp.id);
    const addedForVansh = vanshNotifs.find((n) => n.relatedEntityId === exp.id);

    expect(addedForAyush).toBeDefined();
    expect(addedForAyush?.affectsBalance).toBe(true);
    // Vansh was not part of the split, so he must NOT be spammed
    expect(addedForVansh).toBeUndefined();

    // First push dispatch succeeds; second attempt with same dedupKey is blocked
    expect(notifService.shouldDispatchPush('household-flat-1', addedForAyush!)).toBe(true);
    expect(notifService.shouldDispatchPush('household-flat-1', addedForAyush!)).toBe(false);
  });
});
