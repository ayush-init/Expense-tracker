/**
 * RoomSync Core Domain Models & Financial Types
 * All monetary amounts are represented in integer paise (₹100.50 = 10050 paise).
 */

export type HouseholdRole = 'admin' | 'member';
export type MembershipStatus = 'active' | 'invited' | 'left';

export type PaymentMethod =
  | 'Cash'
  | 'PhonePe'
  | 'Google Pay (GPay)'
  | 'Paytm'
  | 'UPI (other app)'
  | 'Bank transfer'
  | 'Card'
  | 'Other';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Google Pay (GPay)',
  'PhonePe',
  'Paytm',
  'UPI (other app)',
  'Cash',
  'Bank transfer',
  'Card',
  'Other',
];

export type ExpenseCategory =
  | 'Groceries'
  | 'Vegetables'
  | 'Milk'
  | 'Snacks'
  | 'Cleaning supplies'
  | 'Electricity'
  | 'Wi-Fi'
  | 'Rent'
  | 'Household essentials'
  | 'Other purchases';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Groceries',
  'Vegetables',
  'Milk',
  'Snacks',
  'Cleaning supplies',
  'Electricity',
  'Wi-Fi',
  'Rent',
  'Household essentials',
  'Other purchases',
];

export type SplitType = 'equal' | 'custom' | 'personal';
export type ExpenseStatus = 'active' | 'voided';

export type MealType = 'lunch' | 'dinner';
export type MealSkipReason =
  | 'Food provider/uncle did not come'
  | 'We did not order food'
  | 'I did not eat'
  | 'Other';

export const MEAL_SKIP_REASONS: MealSkipReason[] = [
  'Food provider/uncle did not come',
  'We did not order food',
  'I did not eat',
  'Other',
];

export type FoodCycleStatus = 'open' | 'settled';
export type SettlementType = 'full' | 'partial';

export type PaymentStatus =
  | 'recorded'
  | 'pending_confirmation'
  | 'confirmed'
  | 'disputed'
  | 'voided';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  authProvider: 'email' | 'google';
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  foodProviderName: string; // Default: 'Rox'
  defaultMealPricePaise: number; // e.g., 8000 = ₹80
  defaultLunchEnabled: boolean;
  defaultDinnerEnabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  status: MembershipStatus;
  notificationsEnabled: boolean;
  joinedAt: string;
  profile?: Profile;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  sharePaise: number;
}

export interface ExpenseAttachment {
  id: string;
  expenseId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  uploadedByUserId: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  householdId: string;
  title: string;
  amountPaise: number;
  category: ExpenseCategory;
  expenseDate: string; // ISO string
  paidByUserId: string;
  createdByUserId: string;
  splitType: SplitType;
  paymentMethod: PaymentMethod;
  note?: string;
  status: ExpenseStatus;
  voidReason?: string;
  voidedByUserId?: string;
  voidedAt?: string;
  splits: ExpenseSplit[];
  attachments: ExpenseAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface FoodCycle {
  id: string;
  householdId: string;
  providerName: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  settledAt?: string;
  status: FoodCycleStatus;
  totalAmountPaise: number;
  settledAmountPaise: number;
  outstandingAmountPaise: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealEntry {
  id: string;
  householdId: string;
  cycleId: string;
  userId: string;
  mealDate: string; // YYYY-MM-DD
  mealType: MealType;
  providerName: string;
  received: boolean;
  skipReason?: MealSkipReason;
  note?: string;
  pricePaise: number; // Immutable historical price captured for this meal
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodSettlement {
  id: string;
  householdId: string;
  cycleId: string;
  paidByUserId: string;
  amountPaise: number;
  settlementType: SettlementType;
  paymentMethod: PaymentMethod;
  referenceId?: string;
  note?: string;
  proofUri?: string;
  settledAt: string;
  createdAt: string;
}

export interface PaymentAttachment {
  id: string;
  paymentId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  uploadedByUserId: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  householdId: string;
  paidByUserId: string;
  paidToUserId: string;
  amountPaise: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceId?: string;
  note?: string;
  status: PaymentStatus;
  statusNote?: string;
  createdByUserId: string;
  attachments: PaymentAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  householdId: string;
  recipientUserId: string;
  actorUserId: string;
  eventType:
    | 'expense_added'
    | 'expense_edited'
    | 'expense_voided'
    | 'payment_recorded'
    | 'payment_confirmed'
    | 'payment_disputed'
    | 'meal_updated'
    | 'food_settled';
  title: string;
  body: string;
  amountPaise?: number;
  affectsBalance: boolean;
  relatedEntityType?: 'expense' | 'payment' | 'meal' | 'food_cycle';
  relatedEntityId?: string;
  dedupKey: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  householdId: string;
  actorUserId: string;
  actionType: string;
  entityType: 'expense' | 'payment' | 'meal' | 'food_cycle' | 'household';
  entityId: string;
  summary: string;
  amountPaise?: number;
  affectedUserIds: string[];
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}

export interface PairwiseDebt {
  fromUserId: string;
  toUserId: string;
  amountPaise: number;
}

export interface UserBalanceSummary {
  userId: string;
  totalPaidThisMonthPaise: number;
  totalOwedByMePaise: number;
  totalOwedToMePaise: number;
  netBalancePaise: number; // Positive = others owe me; Negative = I owe others
  pairwiseDebts: PairwiseDebt[]; // Net simplified or direct pairwise obligations
}
