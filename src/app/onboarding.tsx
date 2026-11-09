import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  ScreenLayout,
  StatusChip,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { Colors, Spacing, Typography } from '../theme/tokens';
import { rupeesToPaise } from '../utils/currency';

export default function OnboardingScreen() {
  const router = useRouter();
  const { currentUser, joinHouseholdByCode, createHousehold } = useApp();

  const [inviteCode, setInviteCode] = useState('ROOMSYNC302');
  const [flatName, setFlatName] = useState('');
  const [providerName, setProviderName] = useState('Rox');
  const [mealPriceRupees, setMealPriceRupees] = useState('80');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setError(null);
    setLoading(true);
    try {
      await joinHouseholdByCode(inviteCode);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message ?? 'Could not join household');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setLoading(true);
    try {
      const pricePaise = rupeesToPaise(mealPriceRupees || '80');
      await createHousehold({
        name: flatName,
        foodProviderName: providerName || 'Rox',
        defaultMealPricePaise: pricePaise,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message ?? 'Could not create household');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <Text style={styles.title}>Welcome, {currentUser?.fullName ?? 'Roommate'}!</Text>
      <Text style={styles.subtitle}>
        Join Ayush, Yuvraj & Vansh's shared flat using an invite code, or create a new household.
      </Text>

      {error ? (
        <GlassCard variant="subtle" style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </GlassCard>
      ) : null}

      {/* Option 1: Join Existing Household */}
      <GlassCard variant="highlight" style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Join Existing Household</Text>
          <StatusChip label="Recommended" tone="positive" />
        </View>
        <Text style={styles.caption}>
          Use invite code ROOMSYNC302 to join RoomSync Flat 302 with Ayush, Yuvraj & Vansh.
        </Text>
        <GlassInput
          label="Household Invite Code"
          value={inviteCode}
          onChangeText={setInviteCode}
          placeholder="ROOMSYNC302"
          autoCapitalize="characters"
          leftIcon="key-outline"
        />
        <GlassButton
          title="Join Flat with Invite Code"
          icon="enter-outline"
          onPress={handleJoin}
          loading={loading}
        />
      </GlassCard>

      {/* Option 2: Create a Brand New Household */}
      <GlassCard variant="elevated" style={styles.card}>
        <Text style={styles.sectionTitle}>Or Create a New Household</Text>
        <Text style={styles.caption}>
          Setting up a separate flat? Configure your flat name and default food provider below.
        </Text>
        <GlassInput
          label="Household / Flat Name"
          placeholder="e.g., Green Valley Apt 404"
          value={flatName}
          onChangeText={setFlatName}
          leftIcon="home-outline"
        />
        <GlassInput
          label="Default Food Provider Name"
          placeholder="Rox"
          value={providerName}
          onChangeText={setProviderName}
          leftIcon="restaurant-outline"
        />
        <GlassInput
          label="Default Meal Price (₹)"
          placeholder="80"
          value={mealPriceRupees}
          onChangeText={setMealPriceRupees}
          prefixText="₹"
          keyboardType="numeric"
        />
        <GlassButton
          title="Create New Household"
          variant="secondary"
          icon="add-circle-outline"
          onPress={handleCreate}
          loading={loading}
        />
      </GlassCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.h1,
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.text.muted,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  card: {
    marginBottom: Spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  errorCard: {
    borderColor: Colors.semantic.negativeBorder,
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: Colors.semantic.negative,
    fontWeight: '600',
  },
});
