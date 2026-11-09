# RoomSync — Shared-Flat Expense, Food & Payment Tracker

RoomSync is a mobile-first (Expo + React Native + TypeScript) fintech-grade shared household application built with a **Light Glassmorphism** aesthetic for roommates (**Ayush**, **Yuvraj**, and **Vansh**, while supporting additional members and households).

## Core Capabilities

1. **Personalized Dashboard**: Live monthly spending paid by the logged-in user, net balance (what you owe vs. what others owe you), current food settlement cycle accumulator, recent activity feed, and one-tap quick actions.
2. **Normal Household Expenses**: Independent payer and participant selection, personal expense support, equal and custom splits with deterministic paise allocation, payment method tracking, receipt attachments, and edit/void audit trail.
3. **Personal Meal Calendar & Food Tracking**: Interactive monthly calendar with Lunch & Dinner tracking per member, default vendor (`Rox`) and configurable meal pricing, skip reasons (*Provider did not come*, *We did not order food*, *I did not eat*, *Other*), and immutable historical meal pricing.
4. **Settlement-Based Food Cycles**: Food charges accumulate across settlement cycles rather than resetting on calendar month boundaries. Supports both full settlements (closes current cycle and starts a fresh cycle at ₹0) and partial settlements.
5. **Roommate Repayments & Proof**: Record payments via Cash, PhonePe, Google Pay (GPay), Paytm, UPI, Bank Transfer, Card, or Other, attach payment screenshots/slips, and confirm or dispute manually recorded repayments.
6. **Real-Time Activity & Notifications**: Targeted notifications only to affected roommates, balance-impact indicators, and full audit history.

## Project Structure

```text
e:\expense-tracker
├── db/
│   └── migrations/          # PostgreSQL schema, indexes, and RLS policies (Neon compatible)
├── scripts/
│   ├── lint.mjs             # Security & code quality linter
│   ├── migrate.ts           # Neon PostgreSQL migration runner
│   └── seed.ts              # Household seed script for Ayush, Yuvraj & Vansh
├── src/
│   ├── app/                 # Expo Router screens & navigation
│   ├── components/          # Reusable Light Glassmorphism UI components
│   ├── context/             # Reactive App, Auth & Household state store
│   ├── services/            # Neon PostgreSQL / Local persistent database & notification services
│   ├── theme/               # Light Glassmorphism design tokens
│   ├── types/               # Strict TypeScript domain models
│   └── utils/               # Integer paise financial & date calculation engines
└── tests/                   # Automated unit & integration test suites
```

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Fill in `DATABASE_URL` / `EXPO_PUBLIC_DATABASE_URL` with your Neon PostgreSQL connection string.
3. **Run database migrations & seed (when `DATABASE_URL` is configured)**:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. **Run checks & tests**:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```
5. **Launch the app**:
   ```bash
   npm run start
   # or npm run android / npm run web
   ```
