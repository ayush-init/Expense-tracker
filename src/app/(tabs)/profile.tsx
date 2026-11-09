import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  EmptyState,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassModal,
  ListRow,
  MemberAvatar,
  MemberPill,
  ScreenLayout,
  StatusChip,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { isNeonConfigured } from '../../services/database';
import { Colors, Radii, Spacing, Typography } from '../../theme/tokens';
import { formatINR, paiseToRupees, rupeesToPaise } from '../../utils/currency';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const {
    currentUser,
    activeHousehold,
    members,
    activityLogs,
    googleOAuthConfig,
    updateProfile,
    updateHouseholdSettings,
    toggleNotificationPreference,
    signInAsRoommate,
    signOut,
  } = useApp();

  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  const [flatName, setFlatName] = useState(activeHousehold?.name ?? '');
  const [providerName, setProviderName] = useState(
    activeHousehold?.foodProviderName ?? 'Rox'
  );
  const [mealPriceRupees, setMealPriceRupees] = useState(
    String(paiseToRupees(activeHousehold?.defaultMealPricePaise ?? 8000))
  );
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName);
      setPhone(currentUser.phone ?? '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeHousehold) {
      setFlatName(activeHousehold.name);
      setProviderName(activeHousehold.foodProviderName);
      setMealPriceRupees(String(paiseToRupees(activeHousehold.defaultMealPricePaise)));
    }
  }, [activeHousehold]);

  const myMembership = members.find((m) => m.userId === currentUser?.id);
  const isAdmin = myMembership?.role === 'admin';
  const notificationsEnabled = myMembership?.notificationsEnabled ?? true;

  const handleSaveProfile = async () => {
    setProfileSavedMsg(null);
    await updateProfile({ fullName, phone });
    setProfileSavedMsg('Profile updated!');
  };

  const handleSaveHouseholdSettings = async () => {
    setSettingsMsg(null);
    setSettingsError(null);
    try {
      const pricePaise = rupeesToPaise(mealPriceRupees);
      await updateHouseholdSettings({
        name: flatName,
        foodProviderName: providerName,
        defaultMealPricePaise: pricePaise,
      });
      setSettingsMsg(
        'Household settings saved! Historical meal charges remain unchanged.'
      );
    } catch (err: any) {
      setSettingsError(err?.message ?? 'Could not save household settings');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  const getMemberName = (uid: string) =>
    members.find((m) => m.userId === uid)?.profile.fullName ?? 'Roommate';

  return (
    <ScreenLayout>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>ACCOUNT, FLAT & AUDIT TRAIL</Text>
          <Text style={styles.title}>Profile & Settings</Text>
        </View>
        <GlassButton
          title="Audit Log"
          variant="secondary"
          size="sm"
          icon="shield-checkmark-outline"
          onPress={() => setAuditModalOpen(true)}
        />
      </View>

      {/* Logged-In Profile Summary Card */}
      <GlassCard variant="elevated" style={styles.card}>
        <View style={styles.profileTopRow}>
          <MemberAvatar name={currentUser?.fullName ?? 'User'} size={54} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{currentUser?.fullName}</Text>
            <Text style={styles.profileEmail}>{currentUser?.email}</Text>
          </View>
          <StatusChip
            label={isAdmin ? 'Flat Admin' : 'Roommate'}
            tone={isAdmin ? 'positive' : 'info'}
          />
        </View>

        <GlassInput
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          leftIcon="person-outline"
        />
        <GlassInput
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          leftIcon="call-outline"
          placeholder="+91 98765 00001"
        />

        {profileSavedMsg ? (
          <Text style={styles.successText}>{profileSavedMsg}</Text>
        ) : null}

        <GlassButton
          title="Save Profile Info"
          size="sm"
          icon="save-outline"
          onPress={handleSaveProfile}
        />
      </GlassCard>

      {/* Household Members & Invite Code Card */}
      <GlassCard variant="highlight" style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>
              {activeHousehold?.name ?? 'Household'} Members
            </Text>
            <Text style={styles.caption}>
              Invite Code: {activeHousehold?.inviteCode} (Share to add roommates)
            </Text>
          </View>
          <StatusChip label={`${members.length} Active`} tone="info" />
        </View>

        {members.map((m, idx) => (
          <ListRow
            key={m.id}
            title={`${m.profile.fullName}${m.userId === currentUser?.id ? ' (You)' : ''}`}
            subtitle={m.profile.email}
            leftElement={<MemberAvatar name={m.profile.fullName} size={36} />}
            rightElement={
              <StatusChip
                label={m.role === 'admin' ? 'Admin' : 'Member'}
                tone={m.role === 'admin' ? 'positive' : 'neutral'}
              />
            }
            showDivider={idx < members.length - 1}
          />
        ))}

        {/* Quick Switch Roommate Account for Instant Verification */}
        <View style={styles.switchSection}>
          <Text style={styles.caption}>Switch Active Roommate Session:</Text>
          <View style={styles.wrapRow}>
            {(['user-ayush', 'user-yuvraj', 'user-vansh'] as const).map((uid) => {
              const name =
                uid === 'user-ayush' ? 'Ayush' : uid === 'user-yuvraj' ? 'Yuvraj' : 'Vansh';
              return (
                <MemberPill
                  key={uid}
                  name={name}
                  selected={currentUser?.id === uid}
                  onPress={() => signInAsRoommate(uid)}
                />
              );
            })}
          </View>
        </View>
      </GlassCard>

      {/* Household & Food Configuration (Permission-Protected) */}
      <GlassCard style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Food Vendor & Pricing Settings</Text>
          <StatusChip
            label={isAdmin ? 'Admin Editable' : 'Admin Only'}
            tone={isAdmin ? 'positive' : 'warning'}
          />
        </View>
        <Text style={styles.caption}>
          Default vendor is prefilled as Rox. Changing the default meal price applies only to new
          meals and never alters historical meal charges.
        </Text>

        <GlassInput
          label="Household / Flat Name"
          value={flatName}
          onChangeText={setFlatName}
          editable={isAdmin}
          leftIcon="home-outline"
        />

        <GlassInput
          label="Food Provider / Vendor Name"
          value={providerName}
          onChangeText={setProviderName}
          editable={isAdmin}
          leftIcon="restaurant-outline"
        />

        <GlassInput
          label="Default Price Per Meal (₹)"
          value={mealPriceRupees}
          onChangeText={setMealPriceRupees}
          editable={isAdmin}
          prefixText="₹"
          keyboardType="numeric"
        />

        {settingsError ? <Text style={styles.errorText}>{settingsError}</Text> : null}
        {settingsMsg ? <Text style={styles.successText}>{settingsMsg}</Text> : null}

        <GlassButton
          title={
            isAdmin
              ? 'Save Household & Food Settings'
              : 'Only Household Admin (Ayush) Can Edit'
          }
          disabled={!isAdmin}
          icon="options-outline"
          onPress={handleSaveHouseholdSettings}
        />
      </GlassCard>

      {/* Notification Preferences & System Status */}
      <GlassCard style={styles.card}>
        <Text style={styles.sectionTitle}>Preferences & Backend Status</Text>

        <View style={styles.prefRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prefTitle}>Push & Balance Notifications</Text>
            <Text style={styles.caption}>
              Receive alerts when an expense, meal edit, or repayment affects you
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotificationPreference}
            trackColor={{ false: '#CBD5E1', true: Colors.brand.primary }}
          />
        </View>

        <View style={styles.statusItem}>
          <Ionicons
            name="server-outline"
            size={18}
            color={isNeonConfigured() ? Colors.semantic.positive : Colors.brand.primary}
          />
          <Text style={styles.statusText}>
            Database:{' '}
            {isNeonConfigured()
              ? 'Connected to Neon PostgreSQL'
              : 'Local Transactional Engine Active (Set DATABASE_URL in .env for Neon PostgreSQL)'}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Ionicons
            name="logo-google"
            size={18}
            color={googleOAuthConfig.isConfigured ? Colors.semantic.positive : Colors.semantic.warning}
          />
          <Text style={styles.statusText}>
            Google OAuth:{' '}
            {googleOAuthConfig.isConfigured
              ? 'Configured'
              : 'Ready in code — awaiting EXPO_PUBLIC_GOOGLE_CLIENT_ID_* in .env'}
          </Text>
        </View>

        <View style={styles.actionsFooter}>
          <GlassButton
            title="Open UI Component Sandbox"
            variant="secondary"
            size="sm"
            icon="color-palette-outline"
            onPress={() => router.push('/sandbox')}
          />
          <GlassButton
            title="Sign Out"
            variant="danger"
            size="sm"
            icon="log-out-outline"
            onPress={handleSignOut}
          />
        </View>
      </GlassCard>

      {/* Immutable Audit History Modal */}
      <GlassModal
        visible={auditModalOpen}
        title="Financial Audit & Change History"
        subtitle="Every expense, meal correction, void, and settlement is permanently traceable"
        onClose={() => setAuditModalOpen(false)}
      >
        {activityLogs.length === 0 ? (
          <EmptyState
            title="No Audit Records Yet"
            message="All financial mutations will be recorded here."
          />
        ) : (
          activityLogs.map((log, idx) => (
            <ListRow
              key={log.id}
              title={log.summary}
              subtitle={`Actor: ${getMemberName(log.actorUserId)} • Action: ${log.actionType}`}
              meta={`${new Date(log.createdAt).toLocaleString('en-IN')}${
                log.reason ? ` • Reason: ${log.reason}` : ''
              }`}
              rightElement={
                log.amountPaise ? (
                  <Text style={styles.auditAmount}>{formatINR(log.amountPaise)}</Text>
                ) : undefined
              }
              showDivider={idx < activityLogs.length - 1}
            />
          ))
        )}
      </GlassModal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  overline: {
    ...Typography.overline,
    color: Colors.brand.primary,
  },
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
  },
  card: {
    marginBottom: Spacing.md,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  profileName: {
    ...Typography.h2,
    color: Colors.text.primary,
  },
  profileEmail: {
    ...Typography.caption,
    color: Colors.text.muted,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  caption: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  switchSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.glass.borderSubtle,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glass.borderSubtle,
    marginBottom: 8,
  },
  prefTitle: {
    ...Typography.bodyStrong,
    color: Colors.text.primary,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text.secondary,
  },
  actionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: Spacing.md,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.semantic.positive,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.semantic.negative,
    marginBottom: 8,
  },
  auditAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.brand.primary,
  },
});
