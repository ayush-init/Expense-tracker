import { describe, expect, it } from 'vitest';
import { RoomSyncDatabase } from '../src/services/database';

describe('Phase 11: Profile, Household Settings Permissions & Audit History', () => {
  it('enforces admin-only permission on household settings updates', () => {
    const testDb = new RoomSyncDatabase();

    // Yuvraj is a regular member — cannot change default meal price or vendor name
    expect(() =>
      testDb.updateHouseholdSettings({
        actorUserId: 'user-yuvraj',
        householdId: 'household-flat-1',
        foodProviderName: 'New Vendor',
        defaultMealPricePaise: 9000,
      })
    ).toThrow(/Only a household admin/);

    // Ayush is admin — can update food provider name and default meal price
    const updated = testDb.updateHouseholdSettings({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      foodProviderName: 'Rox Tiffin Service',
      defaultMealPricePaise: 8500,
    });

    expect(updated.foodProviderName).toBe('Rox Tiffin Service');
    expect(updated.defaultMealPricePaise).toBe(8500);
  });

  it('records an immutable audit log entry when household settings or financial records change', () => {
    const testDb = new RoomSyncDatabase();
    testDb.updateHouseholdSettings({
      actorUserId: 'user-ayush',
      householdId: 'household-flat-1',
      defaultMealPricePaise: 9500,
    });

    const latestAudit = testDb.getSnapshot().activityLogs[0];
    expect(latestAudit.actionType).toBe('household_settings_updated');
    expect(latestAudit.previousValue).toEqual({
      foodProviderName: 'Rox',
      defaultMealPricePaise: 8000,
    });
    expect(latestAudit.newValue).toEqual({
      foodProviderName: 'Rox',
      defaultMealPricePaise: 9500,
    });
  });
});
