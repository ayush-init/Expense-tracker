import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassButton,
  GlassCard,
  GlassInput,
  MemberAvatar,
  ScreenLayout,
  StatusChip,
} from '../components/ui';
import { useApp } from '../context/AppContext';
import { Colors, Radii, Spacing, Typography } from '../theme/tokens';
import { rupeesToPaise } from '../utils/currency';

export default function AuthScreen() {
  const router = useRouter();
  const {
    signInWithEmail,
    signUpWithEmail,
    signInAsRoommate,
    googleOAuthConfig,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('ayush@roomsync.app');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('roomsync123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuickRoommateSignIn = async (userId: 'user-ayush' | 'user-yuvraj' | 'user-vansh') => {
    setError(null);
    setLoading(true);
    try {
      await signInAsRoommate(userId);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        router.replace('/(tabs)');
      } else {
        await signUpWithEmail({ email, fullName, password, phone });
        router.replace('/onboarding');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuthPress = () => {
    if (!googleOAuthConfig.isConfigured) {
      setError(
        'Google OAuth is ready in code, but EXPO_PUBLIC_GOOGLE_CLIENT_ID_* is not set in .env yet.'
      );
      return;
    }
  };

  return (
    <ScreenLayout>
      <View style={styles.heroHeader}>
        <View style={styles.logoBadge}>
          <Ionicons name="home" size={26} color={Colors.brand.primary} />
        </View>
        <Text style={styles.appTitle}>RoomSync</Text>
        <Text style={styles.appSubtitle}>
          Light Glassmorphic Expense, Meal & Repayment Tracker for Shared Flats
        </Text>
      </View>

      {/* Instant Roommate Switcher for Ayush, Yuvraj & Vansh */}
      <GlassCard variant="highlight" style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardLabel}>ROOMSYNC FLAT 302 • QUICK LOGIN</Text>
          <StatusChip label="3 Roommates" tone="info" icon="people" />
        </View>
        <Text style={styles.helperCaption}>
          Tap a roommate profile below to open their personalized dashboard, meal calendar & balances:
        </Text>
        <View style={styles.roommateGrid}>
          {(
            [
              { id: 'user-ayush', name: 'Ayush', role: 'Admin' },
              { id: 'user-yuvraj', name: 'Yuvraj', role: 'Member' },
              { id: 'user-vansh', name: 'Vansh', role: 'Member' },
            ] as const
          ).map((rm) => (
            <Pressable
              key={rm.id}
              onPress={() => handleQuickRoommateSignIn(rm.id)}
              style={({ pressed }) => [
                styles.roommateBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <MemberAvatar name={rm.name} size={42} />
              <Text style={styles.roommateName}>{rm.name}</Text>
              <Text style={styles.roommateRole}>{rm.role}</Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      {/* Email Sign In / Sign Up Card */}
      <GlassCard variant="elevated" style={styles.sectionCard}>
        <View style={styles.modeTabs}>
          <Pressable
            onPress={() => {
              setMode('login');
              setError(null);
            }}
            style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
          >
            <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>
              Sign In
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode('signup');
              setEmail('');
              setError(null);
            }}
            style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
          >
            <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>
              Create Account
            </Text>
          </Pressable>
        </View>

        {mode === 'signup' ? (
          <>
            <GlassInput
              label="Full Name"
              placeholder="e.g., Rohan Sharma"
              value={fullName}
              onChangeText={setFullName}
              leftIcon="person-outline"
            />
            <GlassInput
              label="Phone Number (Optional)"
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={setPhone}
              leftIcon="call-outline"
              keyboardType="phone-pad"
            />
          </>
        ) : null}

        <GlassInput
          label="Email Address"
          placeholder="ayush@roomsync.app"
          value={email}
          onChangeText={setEmail}
          leftIcon="mail-outline"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <GlassInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          leftIcon="lock-closed-outline"
          secureTextEntry
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.semantic.negative} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <GlassButton
          title={mode === 'login' ? 'Sign In with Email' : 'Create Account & Continue'}
          icon={mode === 'login' ? 'log-in-outline' : 'person-add-outline'}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: Spacing.xs }}
        />

        {/* Google OAuth Section — Truthful Configuration State */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR OAUTH PROVIDER</Text>
          <View style={styles.dividerLine} />
        </View>

        <GlassButton
          title={
            googleOAuthConfig.isConfigured
              ? 'Continue with Google'
              : 'Google OAuth (Setup Required in .env)'
          }
          variant="secondary"
          icon="logo-google"
          onPress={handleGoogleOAuthPress}
        />
        {!googleOAuthConfig.isConfigured ? (
          <Text style={styles.oauthHint}>
            Google OAuth PKCE flow is implemented. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB / ANDROID to
            .env to activate live Google sign-in.
          </Text>
        ) : null}
      </GlassCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  heroHeader: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: Colors.glass.cardElevated,
    borderWidth: 1,
    borderColor: Colors.glass.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  appTitle: {
    ...Typography.heroAmount,
    color: Colors.text.primary,
  },
  appSubtitle: {
    ...Typography.body,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 320,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    ...Typography.overline,
    color: Colors.brand.primary,
  },
  helperCaption: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  roommateGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  roommateBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.glass.cardElevated,
    borderRadius: Radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  roommateName: {
    ...Typography.bodyStrong,
    color: Colors.text.primary,
    marginTop: 6,
  },
  roommateRole: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 2,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.background.secondary,
    borderRadius: Radii.md,
    padding: 4,
    marginBottom: Spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radii.sm,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: Colors.glass.cardElevated,
  },
  modeTabText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.muted,
  },
  modeTabTextActive: {
    color: Colors.brand.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.negativeBg,
    borderColor: Colors.semantic.negativeBorder,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.semantic.negative,
    flex: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.glass.borderSubtle,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.muted,
    marginHorizontal: 10,
    letterSpacing: 0.8,
  },
  oauthHint: {
    fontSize: 11,
    color: Colors.text.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
