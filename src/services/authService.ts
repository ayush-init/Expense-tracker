/**
 * RoomSync Authentication & Google OAuth Service
 *
 * - Supports Email/Password authentication, instant roommate switch for Ayush/Yuvraj/Vansh,
 *   and Google OAuth 2.0 PKCE flow (`expo-auth-session`).
 * - Strictly checks `isGoogleOAuthConfigured()` so Google OAuth is never falsely shown
 *   as active until `EXPO_PUBLIC_GOOGLE_CLIENT_ID_*` credentials are provided in `.env`.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../types/models';
import { RoomSyncDatabase } from './database';

const SESSION_STORAGE_KEY = '@roomsync/session_v1';

export interface AuthSession {
  user: Profile;
  activeHouseholdId?: string;
  signedInAt: string;
}

export interface GoogleOAuthConfig {
  webClientId?: string;
  androidClientId?: string;
  iosClientId?: string;
  redirectScheme: string;
  isConfigured: boolean;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const env: Record<string, string | undefined> =
    typeof process !== 'undefined' && process.env
      ? (process.env as Record<string, string | undefined>)
      : {};
  const webClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB?.trim() || undefined;
  const androidClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID?.trim() || undefined;
  const iosClientId = env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS?.trim() || undefined;
  const redirectScheme = env.EXPO_PUBLIC_OAUTH_REDIRECT_SCHEME?.trim() || 'roomsync';

  const isConfigured = Boolean(webClientId || androidClientId || iosClientId);
  return {
    webClientId,
    androidClientId,
    iosClientId,
    redirectScheme,
    isConfigured,
  };
}

export class AuthService {
  private database: RoomSyncDatabase;

  constructor(database: RoomSyncDatabase) {
    this.database = database;
  }

  public async loadSavedSession(): Promise<AuthSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthSession;
      const profile = this.database.getUserProfile(parsed.user.id);
      if (!profile) return null;
      const households = this.database.getHouseholdsForUser(profile.id);
      return {
        user: profile,
        activeHouseholdId: parsed.activeHouseholdId ?? households[0]?.id,
        signedInAt: parsed.signedInAt,
      };
    } catch {
      return null;
    }
  }

  public async saveSession(session: AuthSession | null): Promise<void> {
    try {
      if (!session) {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // Ignore storage errors in headless test environments
    }
  }

  public signInWithEmail(email: string, password?: string): AuthSession {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (password !== undefined && password.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    const existing = this.database
      .getSnapshot()
      .profiles.find((p) => p.email.toLowerCase() === cleanEmail);

    if (!existing) {
      throw new Error('No account found for this email. Please sign up first.');
    }

    const households = this.database.getHouseholdsForUser(existing.id);
    return {
      user: existing,
      activeHouseholdId: households[0]?.id,
      signedInAt: new Date().toISOString(),
    };
  }

  public signUpWithEmail(params: {
    email: string;
    fullName: string;
    password?: string;
    phone?: string;
  }): AuthSession {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!params.fullName.trim()) {
      throw new Error('Full name is required');
    }
    if (params.password !== undefined && params.password.length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    const duplicate = this.database
      .getSnapshot()
      .profiles.find((p) => p.email.toLowerCase() === cleanEmail);

    if (duplicate) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const profile = this.database.registerOrLoginUser({
      email: cleanEmail,
      fullName: params.fullName.trim(),
      phone: params.phone,
      authProvider: 'email',
    });

    const households = this.database.getHouseholdsForUser(profile.id);
    return {
      user: profile,
      activeHouseholdId: households[0]?.id,
      signedInAt: new Date().toISOString(),
    };
  }

  public signInAsRoommate(userId: 'user-ayush' | 'user-yuvraj' | 'user-vansh'): AuthSession {
    const profile = this.database.getUserProfile(userId);
    if (!profile) {
      throw new Error(`Roommate profile ${userId} not found`);
    }
    const households = this.database.getHouseholdsForUser(profile.id);
    return {
      user: profile,
      activeHouseholdId: households[0]?.id,
      signedInAt: new Date().toISOString(),
    };
  }

  public completeGoogleOAuthSignIn(googleUser: {
    email: string;
    name: string;
    picture?: string;
  }): AuthSession {
    const oauthConfig = getGoogleOAuthConfig();
    if (!oauthConfig.isConfigured) {
      throw new Error(
        'Google OAuth credentials are not configured yet. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID_* to .env.'
      );
    }

    const profile = this.database.registerOrLoginUser({
      email: googleUser.email,
      fullName: googleUser.name,
      authProvider: 'google',
    });
    const households = this.database.getHouseholdsForUser(profile.id);

    return {
      user: profile,
      activeHouseholdId: households[0]?.id,
      signedInAt: new Date().toISOString(),
    };
  }
}
