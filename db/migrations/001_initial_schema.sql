-- ============================================================================
-- RoomSync Migration 001: Core Relational Schema (Neon PostgreSQL)
-- All monetary amounts are stored as BIGINT integer paise (₹100.50 = 10050).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Households (Flats)
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  food_provider_name TEXT NOT NULL DEFAULT 'Rox',
  default_meal_price_paise BIGINT NOT NULL DEFAULT 8000 CHECK (default_meal_price_paise >= 0),
  default_lunch_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  default_dinner_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Household Members
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'left')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

-- 4. Normal Household Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  category TEXT NOT NULL,
  expense_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_by_user_id UUID NOT NULL REFERENCES profiles(id),
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),
  split_type TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'custom', 'personal')),
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('Cash', 'PhonePe', 'Google Pay (GPay)', 'Paytm', 'UPI (other app)', 'Bank transfer', 'Card', 'Other')
  ),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
  void_reason TEXT,
  voided_by_user_id UUID REFERENCES profiles(id),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Expense Splits (Individual Shares)
CREATE TABLE IF NOT EXISTS expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  share_paise BIGINT NOT NULL CHECK (share_paise >= 0),
  UNIQUE (expense_id, user_id)
);

-- 6. Expense Attachments (Bills / Receipts)
CREATE TABLE IF NOT EXISTS expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_uri TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  uploaded_by_user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Food Settlement Cycles (Independent from Calendar Months)
CREATE TABLE IF NOT EXISTS food_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL DEFAULT 'Rox',
  start_date DATE NOT NULL,
  end_date DATE,
  settled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled')),
  total_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (total_amount_paise >= 0),
  settled_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (settled_amount_paise >= 0),
  outstanding_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (outstanding_amount_paise >= 0),
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Personal Meal Entries
CREATE TABLE IF NOT EXISTS meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES food_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  provider_name TEXT NOT NULL DEFAULT 'Rox',
  received BOOLEAN NOT NULL DEFAULT TRUE,
  skip_reason TEXT CHECK (
    skip_reason IS NULL OR skip_reason IN (
      'Food provider/uncle did not come',
      'We did not order food',
      'I did not eat',
      'Other'
    )
  ),
  note TEXT,
  price_paise BIGINT NOT NULL CHECK (price_paise >= 0),
  updated_by_user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id, meal_date, meal_type)
);

-- 9. Food Settlements (Full or Partial Payments Against a Food Cycle)
CREATE TABLE IF NOT EXISTS food_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES food_cycles(id) ON DELETE CASCADE,
  paid_by_user_id UUID NOT NULL REFERENCES profiles(id),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  settlement_type TEXT NOT NULL CHECK (settlement_type IN ('full', 'partial')),
  payment_method TEXT NOT NULL,
  reference_id TEXT,
  note TEXT,
  proof_uri TEXT,
  settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Roommate-to-Roommate Repayments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  paid_by_user_id UUID NOT NULL REFERENCES profiles(id),
  paid_to_user_id UUID NOT NULL REFERENCES profiles(id),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('Cash', 'PhonePe', 'Google Pay (GPay)', 'Paytm', 'UPI (other app)', 'Bank transfer', 'Card', 'Other')
  ),
  reference_id TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('recorded', 'pending_confirmation', 'confirmed', 'disputed', 'voided')
  ),
  status_note TEXT,
  created_by_user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (paid_by_user_id <> paid_to_user_id)
);

-- 11. Payment Proof Attachments
CREATE TABLE IF NOT EXISTS payment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  file_uri TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  uploaded_by_user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  amount_paise BIGINT,
  affects_balance BOOLEAN NOT NULL DEFAULT FALSE,
  related_entity_type TEXT,
  related_entity_id UUID,
  dedup_key TEXT UNIQUE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Device Push Tokens
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, push_token)
);

-- 14. Immutable Audit & Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  summary TEXT NOT NULL,
  amount_paise BIGINT,
  affected_user_ids UUID[] NOT NULL DEFAULT '{}',
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
