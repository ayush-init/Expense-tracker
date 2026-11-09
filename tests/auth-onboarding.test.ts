import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';
import { AuthService, getGoogleOAuthConfig } from '../src/services/authService';

describe('Phase 4: Authentication, Google OAuth Guard & Household Onboarding', () => {
  it('signs in Ayush, Yuvraj, and Vansh into their shared household', () => {
    const testDb = new RoomSyncDatabase();
    const auth = new AuthService(testDb);

    const ayushSession = auth.signInAsRoommate('user-ayush');
    const yuvrajSession = auth.signInAsRoommate('user-yuvraj');
    const vanshSession = auth.signInAsRoommate('user-vansh');

    expect(ayushSession.user.fullName).toBe('Ayush');
    expect(yuvrajSession.user.fullName).toBe('Yuvraj');
    expect(vanshSession.user.fullName).toBe('Vansh');
    expect(ayushSession.activeHouseholdId).toBe('household-flat-1');
    expect(yuvrajSession.activeHouseholdId).toBe('household-flat-1');
    expect(vanshSession.activeHouseholdId).toBe('household-flat-1');
  });

  it('prevents duplicate account signups and allows joining household by invite code', () => {
    const testDb = new RoomSyncDatabase();
    const auth = new AuthService(testDb);

    expect(() =>
      auth.signUpWithEmail({
        email: 'ayush@roomsync.app',
        fullName: 'Duplicate Ayush',
        password: 'password123',
      })
    ).toThrow(/already exists/);

    const fourthMember = auth.signUpWithEmail({
      email: 'rohan@roomsync.app',
      fullName: 'Rohan',
      password: 'password123',
    });
    expect(fourthMember.activeHouseholdId).toBeUndefined();

    const joinedHousehold = testDb.joinHouseholdByInviteCode(fourthMember.user.id, 'roomsync302');
    expect(joinedHousehold.id).toBe('household-flat-1');
    expect(testDb.getHouseholdMembers(fourthMember.user.id, 'household-flat-1').length).toBe(4);
  });

  it('reports Google OAuth as unconfigured until client IDs are set in environment', () => {
    const cfg = getGoogleOAuthConfig();
    expect(cfg.redirectScheme).toBe('roomsync');
    expect(cfg.isConfigured).toBe(false);
  });
});
