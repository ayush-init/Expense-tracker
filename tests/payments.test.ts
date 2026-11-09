import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import { calculateHouseholdBalances } from '../src/utils/finance';

describe('Phase 9: Roommate Payments, Partial Repayments & Payment Proof', () => {
  it('reduces outstanding balance accurately after a partial roommate repayment', () => {
    const testDb = new RoomSyncDatabase();
    // Seeded state: Vansh owes ₹300 to Ayush and ₹200 to Yuvraj (total -50000 paise)
    // Vansh records a partial repayment of ₹150 (15000 paise) to Ayush via GPay with proof
    const payment = testDb.recordPayment({
      actorUserId: 'user-vansh',
      householdId: 'household-flat-1',
      paidByUserId: 'user-vansh',
      paidToUserId: 'user-ayush',
      amountPaise: 15000,
      paymentMethod: 'Google Pay (GPay)',
      referenceId: 'UTR9988776655',
      note: 'Partial payment for Wi-Fi bill',
      attachment: {
        fileUri: 'file:///proofs/gpay-slip.jpg',
        fileName: 'gpay-slip.jpg',
      },
    });

    expect(payment.attachments.length).toBe(1);
    expect(payment.paymentMethod).toBe('Google Pay (GPay)');

    const snap = testDb.getSnapshot();
    const balances = calculateHouseholdBalances({
      memberUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      expenses: snap.expenses,
      payments: snap.payments,
    });

    // Vansh's debt to Ayush drops from 30000 to 15000; Vansh total owed drops from 50000 to 35000
    expect(balances['user-vansh'].totalOwedByMePaise).toBe(35000);
    expect(balances['user-ayush'].totalOwedToMePaise).toBe(25000);
  });

  it('reverses balance impact if a recorded payment is marked as disputed or voided', () => {
    const testDb = new RoomSyncDatabase();
    const payment = testDb.recordPayment({
      actorUserId: 'user-vansh',
      householdId: 'household-flat-1',
      paidByUserId: 'user-vansh',
      paidToUserId: 'user-yuvraj',
      amountPaise: 20000,
      paymentMethod: 'Cash',
    });

    testDb.updatePaymentStatus({
      actorUserId: 'user-yuvraj',
      householdId: 'household-flat-1',
      paymentId: payment.id,
      status: 'disputed',
      statusNote: 'Did not receive cash yet',
    });

    const snap = testDb.getSnapshot();
    const balances = calculateHouseholdBalances({
      memberUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      expenses: snap.expenses,
      payments: snap.payments,
    });

    // Disputed payment does not reduce Vansh's outstanding balance
    expect(balances['user-vansh'].totalOwedByMePaise).toBe(50000);
  });
});
