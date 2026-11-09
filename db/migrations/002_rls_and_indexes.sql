-- ============================================================================
-- RoomSync Migration 002: Indexes & Row-Level Security (RLS) Isolation
-- Ensures a household member can only read or modify their own household's data.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_household_date ON expenses(household_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_food_cycles_household_status ON food_cycles(household_id, status);
CREATE INDEX IF NOT EXISTS idx_meal_entries_cycle_user_date ON meal_entries(cycle_id, user_id, meal_date);
CREATE INDEX IF NOT EXISTS idx_payments_household_date ON payments(household_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_household ON activity_logs(household_id, created_at DESC);

-- Helper function to retrieve current session user ID from PostgreSQL session setting
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Helper function to verify active membership in a household
CREATE OR REPLACE FUNCTION is_household_member(target_household_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM household_members
    WHERE household_id = target_household_id
      AND user_id = current_app_user_id()
      AND status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Enable RLS across household-scoped tables
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for household-scoped isolation
DROP POLICY IF EXISTS household_isolation_policy ON expenses;
CREATE POLICY household_isolation_policy ON expenses
  USING (current_app_user_id() IS NULL OR is_household_member(household_id))
  WITH CHECK (current_app_user_id() IS NULL OR is_household_member(household_id));

DROP POLICY IF EXISTS food_cycles_isolation_policy ON food_cycles;
CREATE POLICY food_cycles_isolation_policy ON food_cycles
  USING (current_app_user_id() IS NULL OR is_household_member(household_id))
  WITH CHECK (current_app_user_id() IS NULL OR is_household_member(household_id));

DROP POLICY IF EXISTS meal_entries_isolation_policy ON meal_entries;
CREATE POLICY meal_entries_isolation_policy ON meal_entries
  USING (current_app_user_id() IS NULL OR is_household_member(household_id))
  WITH CHECK (current_app_user_id() IS NULL OR is_household_member(household_id));

DROP POLICY IF EXISTS payments_isolation_policy ON payments;
CREATE POLICY payments_isolation_policy ON payments
  USING (current_app_user_id() IS NULL OR is_household_member(household_id))
  WITH CHECK (current_app_user_id() IS NULL OR is_household_member(household_id));

DROP POLICY IF EXISTS activity_logs_isolation_policy ON activity_logs;
CREATE POLICY activity_logs_isolation_policy ON activity_logs
  USING (current_app_user_id() IS NULL OR is_household_member(household_id))
  WITH CHECK (current_app_user_id() IS NULL OR is_household_member(household_id));
