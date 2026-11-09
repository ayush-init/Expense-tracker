# RoomSync — Shared-Flat Expense, Food & Payment Tracker

RoomSync is a mobile-first (**Expo + React Native + TypeScript**) fintech-grade shared household application built with a **Light Glassmorphism** design system for **Ayush**, **Yuvraj**, and **Vansh** (while supporting additional roommates and multiple households).

---

## 1. Completed Phased Architecture (Phases 1–12)

- **Phase 1 — Project Setup**: Expo Router + React Native + TypeScript strict configuration, EAS Android profiles, security linter, and integer paise currency utilities.
- **Phase 2 — Light Glassmorphism Design System**: Translucent frosted cards (`GlassCard`), ambient background orbs (`ScreenLayout`), semantic buttons (`GlassButton`), inputs (`GlassInput`), roommate pills (`MemberPill`), interactive calendar (`CustomCalendar`), and visual component sandbox (`/sandbox`).
- **Phase 3 — Backend Foundation & Neon PostgreSQL Schema**: Complete SQL migrations (`db/migrations/001_initial_schema.sql`, `db/migrations/002_rls_and_indexes.sql`), Row-Level Security (RLS) household isolation, Neon serverless driver (`@neondatabase/serverless`), and local transactional persistence engine.
- **Phase 4 — Authentication & Household Onboarding**: Email/password sign-in & sign-up, instant 1-tap roommate switcher for **Ayush**, **Yuvraj**, and **Vansh**, Google OAuth PKCE structure (`expo-auth-session`), and household onboarding via invite code (`ROOMSYNC302`) or new flat creation.
- **Phase 5 — Personalized Dashboard**: Live monthly spending paid by the logged-in user (clearly distinguished from net share), net & pairwise balance cards, active food cycle accumulator, quick actions, and recent household activity.
- **Phase 6 — Normal Household Expenses**: Independent payer and participant selection, equal split with deterministic remainder paise allocation, personal expense support, live split preview, receipt attachment (`expo-image-picker`), and non-destructive void/cancel flow with mandatory reason.
- **Phase 7 — Personal Meal Calendar & Food Tracking**: Interactive monthly calendar per member with independent **Lunch** and **Dinner** tracking, prefilled vendor **Rox**, configurable meal pricing (default ₹80), skip reasons (*Food provider/uncle did not come*, *We did not order food*, *I did not eat*, *Other*), and immutable historical meal prices.
- **Phase 8 — Settlement-Based Food Cycles**: Food charges accumulate across settlement cycles rather than resetting on calendar month boundaries. Supports both **Full Settlements** (closes current cycle, archives history, starts new cycle at ₹0) and **Partial Settlements** (reduces outstanding balance while keeping cycle open).
- **Phase 9 — Roommate Repayments & Proof**: Record repayments via Cash, PhonePe, Google Pay (GPay), Paytm, UPI, Bank Transfer, Card, or Other, attach screenshot proof, and confirm/dispute/void manually recorded payments.
- **Phase 10 — Activity Feed & Push Notifications**: Targeted notifications only to affected roommates, deduplicated push token dispatch (`NotificationService`), balance-impact badges, and deep links.
- **Phase 11 — Profile, Household Settings & Audit History**: Edit profile, view flat members and invite code, admin-protected food vendor & default meal price settings, notification toggle, and full immutable Financial Audit Log viewer.
- **Phase 12 — End-to-End Testing, Security Review & Android Release Prep**: 11 automated test suites verifying all 13 financial correctness rules, RLS isolation, and EAS Android APK/AAB build profiles.

---

## 2. Database Setup (Neon PostgreSQL)

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Add your Neon PostgreSQL connection string to `.env`:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<endpoint>.neon.tech/<dbname>?sslmode=require
   EXPO_PUBLIC_DATABASE_URL=postgresql://<user>:<password>@<endpoint>.neon.tech/<dbname>?sslmode=require
   ```
3. Run database migrations and seed the initial household for Ayush, Yuvraj & Vansh:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
   *(Note: `.env` is strictly git-ignored so credentials are never committed to GitHub.)*

---

## 3. Google OAuth Setup Instructions

The Google OAuth 2.0 PKCE flow is implemented in [`src/services/authService.ts`](src/services/authService.ts) and [`src/app/auth.tsx`](src/app/auth.tsx). In accordance with the project rules, the app checks `isGoogleOAuthConfigured()` and only activates the live Google OAuth redirect once your credentials are set in `.env`:

1. Open the [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. Configure the **OAuth Consent Screen** (External or Internal) and add scopes `openid`, `profile`, `email`.
3. Create three OAuth 2.0 Client IDs:
   - **Web Application Client ID** (Authorized redirect URI: `https://auth.expo.io/@<your-expo-username>/roomsync` or `http://localhost:8081`)
   - **Android Client ID** (Package name: `com.roomsync.app`, SHA-1 certificate fingerprint from `eas credentials`)
   - **iOS Client ID** (Bundle identifier: `com.roomsync.app`)
4. Paste the Client IDs into your local `.env` file:
   ```env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=your-web-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=your-android-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=your-ios-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_OAUTH_REDIRECT_SCHEME=roomsync
   ```

---

## 4. Running, Testing & Building Android APK

```bash
# Install dependencies
npm install

# Run TypeScript check, security linter, and all 11 test suites
npm run typecheck
npm run lint
npm test

# Start Expo development server
npm run start

# Build installable Android APK via EAS
npx eas-cli build --platform android --profile preview
```
