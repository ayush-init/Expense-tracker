/**
 * RoomSync Database & Persistence Layer (Neon PostgreSQL + Local Transactional Engine)
 *
 * - Connects to Neon PostgreSQL via `@neondatabase/serverless` when `EXPO_PUBLIC_DATABASE_URL`
 *   or `DATABASE_URL` is configured in `.env`.
 * - Enforces Row-Level Security (RLS) household isolation: a user can only read or mutate
 *   records belonging to a household where they are an active member.
 * - Maintains an in-memory / AsyncStorage-backed relational mirror so the app runs offline
 *   or before `.env` is populated, and syncs with Neon PostgreSQL when configured.
 */

import { neon } from '@neondatabase/serverless';
import {
  ActivityLog,
  Expense,
  ExpenseAttachment,
  ExpenseCategory,
  ExpenseSplit,
  FoodCycle,
  FoodSettlement,
  Household,
  HouseholdMember,
  MealEntry,
  MealSkipReason,
  MealType,
  NotificationItem,
  Payment,
  PaymentAttachment,
  PaymentMethod,
  PaymentStatus,
  Profile,
  SplitType,
} from '../types/models';
import {
  calculateEqualSplits,
  calculateFoodCycleSummary,
  validateSplitsExactSum,
} from '../utils/finance';
import { formatINR } from '../utils/currency';
import { getStartOfMonthYYYYMMDD, getTodayYYYYMMDD } from '../utils/calendar';

export interface DatabaseState {
  profiles: Profile[];
  households: Household[];
  householdMembers: HouseholdMember[];
  expenses: Expense[];
  foodCycles: FoodCycle[];
  mealEntries: MealEntry[];
  foodSettlements: FoodSettlement[];
  payments: Payment[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  pushTokens: Array<{ userId: string; pushToken: string; platform: string; updatedAt: string }>;
}

function getConnectionString(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    const url = process.env.EXPO_PUBLIC_DATABASE_URL || process.env.DATABASE_URL;
    if (url && url.startsWith('postgres') && !url.includes('ep-example-123456')) {
      return url;
    }
  }
  return undefined;
}

export function isNeonConfigured(): boolean {
  return Boolean(getConnectionString());
}

export function getNeonSqlClient() {
  const url = getConnectionString();
  if (!url) return null;
  return neon(url);
}

let idCounter = 1000;
export function generateId(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export function createInitialSeedState(): DatabaseState {
  const nowIso = new Date().toISOString();
  const cycleStart = getStartOfMonthYYYYMMDD();
  const todayStr = getTodayYYYYMMDD();

  const profiles: Profile[] = [
    {
      id: 'user-ayush',
      email: 'ayush@roomsync.app',
      fullName: 'Ayush',
      phone: '+91 98765 00001',
      authProvider: 'email',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'user-yuvraj',
      email: 'yuvraj@roomsync.app',
      fullName: 'Yuvraj',
      phone: '+91 98765 00002',
      authProvider: 'email',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'user-vansh',
      email: 'vansh@roomsync.app',
      fullName: 'Vansh',
      phone: '+91 98765 00003',
      authProvider: 'email',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const household: Household = {
    id: 'household-flat-1',
    name: 'RoomSync Flat 302',
    inviteCode: 'ROOMSYNC302',
    foodProviderName: 'Rox',
    defaultMealPricePaise: 8000, // ₹80 per meal
    defaultLunchEnabled: true,
    defaultDinnerEnabled: true,
    createdBy: 'user-ayush',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const householdMembers: HouseholdMember[] = [
    {
      id: 'hm-ayush',
      householdId: household.id,
      userId: 'user-ayush',
      role: 'admin',
      status: 'active',
      notificationsEnabled: true,
      joinedAt: nowIso,
    },
    {
      id: 'hm-yuvraj',
      householdId: household.id,
      userId: 'user-yuvraj',
      role: 'member',
      status: 'active',
      notificationsEnabled: true,
      joinedAt: nowIso,
    },
    {
      id: 'hm-vansh',
      householdId: household.id,
      userId: 'user-vansh',
      role: 'member',
      status: 'active',
      notificationsEnabled: true,
      joinedAt: nowIso,
    },
  ];

  const openCycle: FoodCycle = {
    id: 'cycle-current-1',
    householdId: household.id,
    providerName: 'Rox',
    startDate: cycleStart,
    status: 'open',
    totalAmountPaise: 48000, // 6 meals * ₹80 = ₹480
    settledAmountPaise: 0,
    outstandingAmountPaise: 48000,
    createdByUserId: 'user-ayush',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const mealEntries: MealEntry[] = [
    {
      id: 'meal-1',
      householdId: household.id,
      cycleId: openCycle.id,
      userId: 'user-ayush',
      mealDate: todayStr,
      mealType: 'lunch',
      providerName: 'Rox',
      received: true,
      pricePaise: 8000,
      updatedByUserId: 'user-ayush',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'meal-2',
      householdId: household.id,
      cycleId: openCycle.id,
      userId: 'user-ayush',
      mealDate: todayStr,
      mealType: 'dinner',
      providerName: 'Rox',
      received: true,
      pricePaise: 8000,
      updatedByUserId: 'user-ayush',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'meal-3',
      householdId: household.id,
      cycleId: openCycle.id,
      userId: 'user-yuvraj',
      mealDate: todayStr,
      mealType: 'lunch',
      providerName: 'Rox',
      received: true,
      pricePaise: 8000,
      updatedByUserId: 'user-yuvraj',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'meal-4',
      householdId: household.id,
      cycleId: openCycle.id,
      userId: 'user-yuvraj',
      mealDate: todayStr,
      mealType: 'dinner',
      providerName: 'Rox',
      received: true,
      pricePaise: 8000,
      updatedByUserId: 'user-yuvraj',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'meal-5',
      householdId: household.id,
      cycleId: openCycle.id,
      userId: 'user-vansh',
      mealDate: todayStr,
      mealType: 'lunch',
      providerName: 'Rox',
      received: true,
      pricePaise: 8000,
      updatedByUserId: 'user-vansh',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'meal-6',
      householdId: household.id,
      cycleId: openCycle.id,
      userId: 'user-vansh',
      mealDate: todayStr,
      mealType: 'dinner',
      providerName: 'Rox',
      received: true,
      pricePaise: 8000,
      updatedByUserId: 'user-vansh',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-seed-1',
      householdId: household.id,
      title: 'Fresh Groceries & Dairy',
      amountPaise: 60000, // ₹600
      category: 'Groceries',
      expenseDate: nowIso,
      paidByUserId: 'user-yuvraj',
      createdByUserId: 'user-yuvraj',
      splitType: 'equal',
      paymentMethod: 'Google Pay (GPay)',
      note: 'Milk, bread, eggs, and vegetables for the flat',
      status: 'active',
      splits: [
        { id: 'sp-1', expenseId: 'exp-seed-1', userId: 'user-ayush', sharePaise: 20000 },
        { id: 'sp-2', expenseId: 'exp-seed-1', userId: 'user-yuvraj', sharePaise: 20000 },
        { id: 'sp-3', expenseId: 'exp-seed-1', userId: 'user-vansh', sharePaise: 20000 },
      ],
      attachments: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'exp-seed-2',
      householdId: household.id,
      title: 'High-Speed Fiber Wi-Fi Bill',
      amountPaise: 90000, // ₹900
      category: 'Wi-Fi',
      expenseDate: nowIso,
      paidByUserId: 'user-ayush',
      createdByUserId: 'user-ayush',
      splitType: 'equal',
      paymentMethod: 'PhonePe',
      note: 'Monthly broadband recharge',
      status: 'active',
      splits: [
        { id: 'sp-4', expenseId: 'exp-seed-2', userId: 'user-ayush', sharePaise: 30000 },
        { id: 'sp-5', expenseId: 'exp-seed-2', userId: 'user-yuvraj', sharePaise: 30000 },
        { id: 'sp-6', expenseId: 'exp-seed-2', userId: 'user-vansh', sharePaise: 30000 },
      ],
      attachments: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'act-seed-1',
      householdId: household.id,
      actorUserId: 'user-yuvraj',
      actionType: 'expense_created',
      entityType: 'expense',
      entityId: 'exp-seed-1',
      summary: 'Yuvraj added "Fresh Groceries & Dairy" (₹600) shared with Ayush, Yuvraj & Vansh',
      amountPaise: 60000,
      affectedUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      createdAt: nowIso,
    },
    {
      id: 'act-seed-2',
      householdId: household.id,
      actorUserId: 'user-ayush',
      actionType: 'expense_created',
      entityType: 'expense',
      entityId: 'exp-seed-2',
      summary: 'Ayush added "High-Speed Fiber Wi-Fi Bill" (₹900) shared with Ayush, Yuvraj & Vansh',
      amountPaise: 90000,
      affectedUserIds: ['user-ayush', 'user-yuvraj', 'user-vansh'],
      createdAt: nowIso,
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-seed-1',
      householdId: household.id,
      recipientUserId: 'user-ayush',
      actorUserId: 'user-yuvraj',
      eventType: 'expense_added',
      title: 'New Expense Added by Yuvraj',
      body: 'Yuvraj paid ₹600 for Fresh Groceries & Dairy. Your share is ₹200.',
      amountPaise: 20000,
      affectsBalance: true,
      relatedEntityType: 'expense',
      relatedEntityId: 'exp-seed-1',
      dedupKey: 'seed-exp-1-ayush',
      isRead: false,
      createdAt: nowIso,
    },
    {
      id: 'notif-seed-2',
      householdId: household.id,
      recipientUserId: 'user-vansh',
      actorUserId: 'user-yuvraj',
      eventType: 'expense_added',
      title: 'New Expense Added by Yuvraj',
      body: 'Yuvraj paid ₹600 for Fresh Groceries & Dairy. Your share is ₹200.',
      amountPaise: 20000,
      affectsBalance: true,
      relatedEntityType: 'expense',
      relatedEntityId: 'exp-seed-1',
      dedupKey: 'seed-exp-1-vansh',
      isRead: false,
      createdAt: nowIso,
    },
  ];

  return {
    profiles,
    households: [household],
    householdMembers,
    expenses,
    foodCycles: [openCycle],
    mealEntries,
    foodSettlements: [],
    payments: [],
    notifications,
    activityLogs,
    pushTokens: [],
  };
}

export class RoomSyncDatabase {
  private state: DatabaseState;

  constructor(initialState?: DatabaseState) {
    this.state = initialState ?? createInitialSeedState();
  }

  public getSnapshot(): DatabaseState {
    return this.state;
  }

  public loadSnapshot(snapshot: DatabaseState): void {
    this.state = snapshot;
  }

  /**
   * Row-Level Security (RLS) Guard:
   * Verifies that `actorUserId` is an active member of `householdId`.
   * Throws an Unauthorized error if the user belongs to a different household or has no membership.
   */
  public assertHouseholdAccess(actorUserId: string, householdId: string): HouseholdMember {
    const member = this.state.householdMembers.find(
      (m) => m.householdId === householdId && m.userId === actorUserId && m.status === 'active'
    );
    if (!member) {
      throw new Error(
        `RLS Access Denied: User ${actorUserId} is not an active member of household ${householdId}`
      );
    }
    return member;
  }

  public getUserProfile(userId: string): Profile | undefined {
    return this.state.profiles.find((p) => p.id === userId);
  }

  public getUserName(userId: string): string {
    return this.getUserProfile(userId)?.fullName ?? 'Roommate';
  }

  public getHouseholdsForUser(userId: string): Household[] {
    const memberHouseholdIds = new Set(
      this.state.householdMembers
        .filter((m) => m.userId === userId && m.status === 'active')
        .map((m) => m.householdId)
    );
    return this.state.households.filter((h) => memberHouseholdIds.has(h.id));
  }

  public getHouseholdMembers(actorUserId: string, householdId: string): Array<HouseholdMember & { profile: Profile }> {
    this.assertHouseholdAccess(actorUserId, householdId);
    return this.state.householdMembers
      .filter((m) => m.householdId === householdId && m.status === 'active')
      .map((m) => {
        const profile = this.state.profiles.find((p) => p.id === m.userId)!;
        return { ...m, profile };
      });
  }

  public getExpenses(actorUserId: string, householdId: string): Expense[] {
    this.assertHouseholdAccess(actorUserId, householdId);
    return this.state.expenses
      .filter((e) => e.householdId === householdId)
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }

  /**
   * Create a new normal household expense (with equal, custom, or personal split),
   * record an immutable activity log, and dispatch notifications ONLY to affected members.
   */
  public createExpense(params: {
    actorUserId: string;
    householdId: string;
    title: string;
    amountPaise: number;
    category: ExpenseCategory;
    expenseDate?: string;
    paidByUserId: string;
    participantUserIds: string[];
    splitType?: SplitType;
    customSplits?: Array<{ userId: string; sharePaise: number }>;
    paymentMethod: PaymentMethod;
    note?: string;
    attachment?: { fileUri: string; fileName: string; mimeType?: string };
  }): Expense {
    this.assertHouseholdAccess(params.actorUserId, params.householdId);
    this.assertHouseholdAccess(params.paidByUserId, params.householdId);

    if (!params.title.trim()) {
      throw new Error('Expense title is required');
    }
    if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
      throw new Error('Expense amount must be a positive integer in paise');
    }

    const splitType: SplitType = params.splitType ?? 'equal';
    let computedSplits: Array<{ userId: string; sharePaise: number }> = [];

    if (splitType === 'personal') {
      computedSplits = [{ userId: params.paidByUserId, sharePaise: params.amountPaise }];
    } else if (splitType === 'custom' && params.customSplits) {
      if (!validateSplitsExactSum(params.amountPaise, params.customSplits)) {
        throw new Error('Custom split shares must add up exactly to the expense amount');
      }
      computedSplits = params.customSplits.filter((s) => s.sharePaise > 0);
    } else {
      if (params.participantUserIds.length === 0) {
        throw new Error('Select at least one household member to share this expense');
      }
      for (const pid of params.participantUserIds) {
        this.assertHouseholdAccess(pid, params.householdId);
      }
      computedSplits = calculateEqualSplits(params.amountPaise, params.participantUserIds);
    }

    if (!validateSplitsExactSum(params.amountPaise, computedSplits)) {
      throw new Error('Split shares do not equal the total expense amount');
    }

    const nowIso = new Date().toISOString();
    const expenseId = generateId('exp');

    const splits: ExpenseSplit[] = computedSplits.map((s, idx) => ({
      id: `${expenseId}-sp-${idx + 1}`,
      expenseId,
      userId: s.userId,
      sharePaise: s.sharePaise,
    }));

    const attachments: ExpenseAttachment[] = params.attachment
      ? [
          {
            id: generateId('exp-att'),
            expenseId,
            fileUri: params.attachment.fileUri,
            fileName: params.attachment.fileName,
            mimeType: params.attachment.mimeType ?? 'image/jpeg',
            uploadedByUserId: params.actorUserId,
            createdAt: nowIso,
          },
        ]
      : [];

    const newExpense: Expense = {
      id: expenseId,
      householdId: params.householdId,
      title: params.title.trim(),
      amountPaise: params.amountPaise,
      category: params.category,
      expenseDate: params.expenseDate ?? nowIso,
      paidByUserId: params.paidByUserId,
      createdByUserId: params.actorUserId,
      splitType,
      paymentMethod: params.paymentMethod,
      note: params.note?.trim() || undefined,
      status: 'active',
      splits,
      attachments,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.state.expenses.unshift(newExpense);

    const payerName = this.getUserName(params.paidByUserId);
    const participantNames = splits.map((s) => this.getUserName(s.userId)).join(', ');
    const affectedIds = Array.from(
      new Set([params.paidByUserId, ...splits.map((s) => s.userId)])
    );

    this.state.activityLogs.unshift({
      id: generateId('act'),
      householdId: params.householdId,
      actorUserId: params.actorUserId,
      actionType: 'expense_created',
      entityType: 'expense',
      entityId: expenseId,
      summary: `${payerName} paid ${formatINR(params.amountPaise)} for "${newExpense.title}" (${
        splitType === 'personal' ? 'Personal expense' : `Shared with ${participantNames}`
      })`,
      amountPaise: params.amountPaise,
      affectedUserIds: affectedIds,
      newValue: { title: newExpense.title, amountPaise: newExpense.amountPaise, splits },
      createdAt: nowIso,
    });

    // Notify ONLY affected members (excluding the actor who added it)
    for (const split of splits) {
      if (split.userId === params.actorUserId) continue;
      this.state.notifications.unshift({
        id: generateId('notif'),
        householdId: params.householdId,
        recipientUserId: split.userId,
        actorUserId: params.actorUserId,
        eventType: 'expense_added',
        title: `${payerName} added "${newExpense.title}"`,
        body: `Total ${formatINR(params.amountPaise)} (${params.category}). Your share is ${formatINR(
          split.sharePaise
        )}.`,
        amountPaise: split.sharePaise,
        affectsBalance: split.userId !== params.paidByUserId,
        relatedEntityType: 'expense',
        relatedEntityId: expenseId,
        dedupKey: `exp-add-${expenseId}-${split.userId}`,
        isRead: false,
        createdAt: nowIso,
      });
    }

    return newExpense;
  }

  /**
   * Void/Cancel an expense with a mandatory reason (Rule #10: Never silently delete financial history).
   */
  public voidExpense(params: {
    actorUserId: string;
    householdId: string;
    expenseId: string;
    reason: string;
  }): Expense {
    this.assertHouseholdAccess(params.actorUserId, params.householdId);
    const expense = this.state.expenses.find(
      (e) => e.id === params.expenseId && e.householdId === params.householdId
    );
    if (!expense) throw new Error('Expense not found');
    if (expense.status === 'voided') throw new Error('Expense is already voided');
    if (!params.reason.trim()) throw new Error('A cancellation reason is required for the audit trail');

    const nowIso = new Date().toISOString();
    expense.status = 'voided';
    expense.voidReason = params.reason.trim();
    expense.voidedByUserId = params.actorUserId;
    expense.voidedAt = nowIso;
    expense.updatedAt = nowIso;

    const actorName = this.getUserName(params.actorUserId);
    const affectedIds = Array.from(
      new Set([expense.paidByUserId, ...expense.splits.map((s) => s.userId)])
    );

    this.state.activityLogs.unshift({
      id: generateId('act'),
      householdId: params.householdId,
      actorUserId: params.actorUserId,
      actionType: 'expense_voided',
      entityType: 'expense',
      entityId: expense.id,
      summary: `${actorName} voided "${expense.title}" (${formatINR(
        expense.amountPaise
      )}) — Reason: ${expense.voidReason}`,
      amountPaise: expense.amountPaise,
      affectedUserIds: affectedIds,
      reason: expense.voidReason,
      createdAt: nowIso,
    });

    for (const uid of affectedIds) {
      if (uid === params.actorUserId) continue;
      this.state.notifications.unshift({
        id: generateId('notif'),
        householdId: params.householdId,
        recipientUserId: uid,
        actorUserId: params.actorUserId,
        eventType: 'expense_voided',
        title: `Expense Cancelled: ${expense.title}`,
        body: `${actorName} voided "${expense.title}" (${formatINR(
          expense.amountPaise
        )}). Reason: ${expense.voidReason}`,
        amountPaise: expense.amountPaise,
        affectsBalance: true,
        relatedEntityType: 'expense',
        relatedEntityId: expense.id,
        dedupKey: `exp-void-${expense.id}-${uid}`,
        isRead: false,
        createdAt: nowIso,
      });
    }

    return expense;
  }

  /**
   * Upsert a personal meal entry (Lunch or Dinner) for a given date.
   * Enforces personal permission: a member can update their own meals; only an admin can correct another member's meal.
   */
  public upsertMealEntry(params: {
    actorUserId: string;
    householdId: string;
    targetUserId: string;
    mealDate: string;
    mealType: MealType;
    received: boolean;
    skipReason?: MealSkipReason;
    note?: string;
  }): MealEntry {
    const actorMembership = this.assertHouseholdAccess(params.actorUserId, params.householdId);
    this.assertHouseholdAccess(params.targetUserId, params.householdId);

    if (params.actorUserId !== params.targetUserId && actorMembership.role !== 'admin') {
      throw new Error('Only the meal owner or a household admin can modify this meal entry');
    }
    if (!params.received && !params.skipReason) {
      throw new Error('Please select a reason when marking a meal as skipped/not received');
    }

    const household = this.state.households.find((h) => h.id === params.householdId)!;
    const openCycle = this.getOrCreateOpenFoodCycle(params.householdId, params.actorUserId);
    const nowIso = new Date().toISOString();

    const existing = this.state.mealEntries.find(
      (m) =>
        m.householdId === params.householdId &&
        m.userId === params.targetUserId &&
        m.mealDate === params.mealDate &&
        m.mealType === params.mealType &&
        m.cycleId === openCycle.id
    );

    let entry: MealEntry;
    if (existing) {
      const prevReceived = existing.received;
      existing.received = params.received;
      existing.skipReason = params.received ? undefined : params.skipReason;
      existing.note = params.note?.trim() || undefined;
      existing.updatedByUserId = params.actorUserId;
      existing.updatedAt = nowIso;
      entry = existing;

      this.state.activityLogs.unshift({
        id: generateId('act'),
        householdId: params.householdId,
        actorUserId: params.actorUserId,
        actionType: 'meal_updated',
        entityType: 'meal',
        entityId: existing.id,
        summary: `${this.getUserName(params.actorUserId)} updated ${this.getUserName(
          params.targetUserId
        )}'s ${params.mealType} on ${params.mealDate} to ${
          params.received ? 'Received' : `Skipped (${params.skipReason})`
        }`,
        amountPaise: params.received ? existing.pricePaise : 0,
        affectedUserIds: [params.targetUserId],
        previousValue: { received: prevReceived },
        newValue: { received: params.received, skipReason: params.skipReason },
        reason: params.skipReason,
        createdAt: nowIso,
      });
    } else {
      entry = {
        id: generateId('meal'),
        householdId: params.householdId,
        cycleId: openCycle.id,
        userId: params.targetUserId,
        mealDate: params.mealDate,
        mealType: params.mealType,
        providerName: household.foodProviderName,
        received: params.received,
        skipReason: params.received ? undefined : params.skipReason,
        note: params.note?.trim() || undefined,
        pricePaise: household.defaultMealPricePaise, // Captures current default price immutably
        updatedByUserId: params.actorUserId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.state.mealEntries.push(entry);

      this.state.activityLogs.unshift({
        id: generateId('act'),
        householdId: params.householdId,
        actorUserId: params.actorUserId,
        actionType: 'meal_recorded',
        entityType: 'meal',
        entityId: entry.id,
        summary: `${this.getUserName(params.actorUserId)} marked ${this.getUserName(
          params.targetUserId
        )}'s ${params.mealType} on ${params.mealDate} as ${
          params.received ? 'Received' : `Skipped (${params.skipReason})`
        }`,
        amountPaise: params.received ? entry.pricePaise : 0,
        affectedUserIds: [params.targetUserId],
        reason: params.skipReason,
        createdAt: nowIso,
      });
    }

    this.recomputeCycleTotals(openCycle.id, params.householdId);

    // If an admin updated another member's meal, notify that member
    if (params.actorUserId !== params.targetUserId) {
      this.state.notifications.unshift({
        id: generateId('notif'),
        householdId: params.householdId,
        recipientUserId: params.targetUserId,
        actorUserId: params.actorUserId,
        eventType: 'meal_updated',
        title: `Meal Entry Updated by ${this.getUserName(params.actorUserId)}`,
        body: `Your ${params.mealType} on ${params.mealDate} was marked as ${
          params.received ? 'Received' : `Skipped (${params.skipReason})`
        }.`,
        affectsBalance: false,
        relatedEntityType: 'meal',
        relatedEntityId: entry.id,
        dedupKey: `meal-edit-${entry.id}-${nowIso}`,
        isRead: false,
        createdAt: nowIso,
      });
    }

    return entry;
  }

  public getOrCreateOpenFoodCycle(householdId: string, actorUserId: string): FoodCycle {
    const existing = this.state.foodCycles.find(
      (c) => c.householdId === householdId && c.status === 'open'
    );
    if (existing) {
      this.recomputeCycleTotals(existing.id, householdId);
      return existing;
    }

    const household = this.state.households.find((h) => h.id === householdId)!;
    const nowIso = new Date().toISOString();
    const newCycle: FoodCycle = {
      id: generateId('cycle'),
      householdId,
      providerName: household.foodProviderName,
      startDate: getTodayYYYYMMDD(),
      status: 'open',
      totalAmountPaise: 0,
      settledAmountPaise: 0,
      outstandingAmountPaise: 0,
      createdByUserId: actorUserId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.state.foodCycles.unshift(newCycle);
    return newCycle;
  }

  private recomputeCycleTotals(cycleId: string, householdId: string): void {
    const cycle = this.state.foodCycles.find((c) => c.id === cycleId);
    if (!cycle) return;
    const memberIds = this.state.householdMembers
      .filter((m) => m.householdId === householdId && m.status === 'active')
      .map((m) => m.userId);
    const summary = calculateFoodCycleSummary(
      cycle,
      this.state.mealEntries,
      this.state.foodSettlements,
      memberIds
    );
    cycle.totalAmountPaise = summary.totalAmountPaise;
    cycle.settledAmountPaise = summary.settledAmountPaise;
    cycle.outstandingAmountPaise = summary.outstandingAmountPaise;
    cycle.updatedAt = new Date().toISOString();
  }

  /**
   * Record a full or partial food settlement against the open food cycle.
   * - Partial settlement reduces outstanding amount and leaves the cycle OPEN.
   * - Full settlement pays the full remaining balance, marks the current cycle as SETTLED,
   *   preserves it permanently in history, and starts a brand-new cycle at ₹0.
   */
  public recordFoodSettlement(params: {
    actorUserId: string;
    householdId: string;
    paidByUserId: string;
    amountPaise: number;
    paymentMethod: PaymentMethod;
    referenceId?: string;
    note?: string;
    proofUri?: string;
    settlementDate?: string; // YYYY-MM-DD
  }): { settlement: FoodSettlement; closedCycle?: FoodCycle; activeCycle: FoodCycle } {
    this.assertHouseholdAccess(params.actorUserId, params.householdId);
    this.assertHouseholdAccess(params.paidByUserId, params.householdId);

    const openCycle = this.getOrCreateOpenFoodCycle(params.householdId, params.actorUserId);
    this.recomputeCycleTotals(openCycle.id, params.householdId);

    if (openCycle.outstandingAmountPaise <= 0) {
      throw new Error('Current food cycle has ₹0 outstanding balance to settle');
    }
    if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
      throw new Error('Settlement amount must be a positive integer in paise');
    }
    if (params.amountPaise > openCycle.outstandingAmountPaise) {
      throw new Error('Settlement amount cannot exceed the current outstanding food balance');
    }

    const isFull = params.amountPaise === openCycle.outstandingAmountPaise;
    const nowIso = new Date().toISOString();
    const settlementDateStr = params.settlementDate ?? getTodayYYYYMMDD();

    const settlement: FoodSettlement = {
      id: generateId('fsettle'),
      householdId: params.householdId,
      cycleId: openCycle.id,
      paidByUserId: params.paidByUserId,
      amountPaise: params.amountPaise,
      settlementType: isFull ? 'full' : 'partial',
      paymentMethod: params.paymentMethod,
      referenceId: params.referenceId?.trim() || undefined,
      note: params.note?.trim() || undefined,
      proofUri: params.proofUri,
      settledAt: nowIso,
      createdAt: nowIso,
    };

    this.state.foodSettlements.unshift(settlement);
    this.recomputeCycleTotals(openCycle.id, params.householdId);

    const payerName = this.getUserName(params.paidByUserId);
    const memberIds = this.state.householdMembers
      .filter((m) => m.householdId === params.householdId && m.status === 'active')
      .map((m) => m.userId);

    let closedCycle: FoodCycle | undefined;
    let activeCycle: FoodCycle = openCycle;

    if (isFull) {
      openCycle.status = 'settled';
      openCycle.endDate = settlementDateStr;
      openCycle.settledAt = nowIso;
      closedCycle = openCycle;

      const household = this.state.households.find((h) => h.id === params.householdId)!;
      const freshCycle: FoodCycle = {
        id: generateId('cycle'),
        householdId: params.householdId,
        providerName: household.foodProviderName,
        startDate: settlementDateStr,
        status: 'open',
        totalAmountPaise: 0,
        settledAmountPaise: 0,
        outstandingAmountPaise: 0,
        createdByUserId: params.actorUserId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.state.foodCycles.unshift(freshCycle);
      activeCycle = freshCycle;
    }

    this.state.activityLogs.unshift({
      id: generateId('act'),
      householdId: params.householdId,
      actorUserId: params.actorUserId,
      actionType: isFull ? 'food_cycle_settled_full' : 'food_cycle_settled_partial',
      entityType: 'food_cycle',
      entityId: openCycle.id,
      summary: `${payerName} recorded a ${isFull ? 'FULL' : 'PARTIAL'} food settlement of ${formatINR(
        params.amountPaise
      )} to ${openCycle.providerName} via ${params.paymentMethod}`,
      amountPaise: params.amountPaise,
      affectedUserIds: memberIds,
      createdAt: nowIso,
    });

    for (const uid of memberIds) {
      if (uid === params.actorUserId) continue;
      this.state.notifications.unshift({
        id: generateId('notif'),
        householdId: params.householdId,
        recipientUserId: uid,
        actorUserId: params.actorUserId,
        eventType: 'food_settled',
        title: isFull ? 'Food Cycle Fully Settled' : 'Partial Food Settlement Recorded',
        body: `${payerName} paid ${formatINR(params.amountPaise)} to ${
          openCycle.providerName
        }. ${
          isFull
            ? 'A fresh food cycle has started from ₹0.'
            : `Remaining food balance: ${formatINR(openCycle.outstandingAmountPaise)}.`
        }`,
        amountPaise: params.amountPaise,
        affectsBalance: true,
        relatedEntityType: 'food_cycle',
        relatedEntityId: openCycle.id,
        dedupKey: `food-settle-${settlement.id}-${uid}`,
        isRead: false,
        createdAt: nowIso,
      });
    }

    return { settlement, closedCycle, activeCycle };
  }

  /**
   * Record a roommate-to-roommate repayment with optional payment proof screenshot/slip.
   */
  public recordPayment(params: {
    actorUserId: string;
    householdId: string;
    paidByUserId: string;
    paidToUserId: string;
    amountPaise: number;
    paymentMethod: PaymentMethod;
    referenceId?: string;
    note?: string;
    status?: PaymentStatus;
    attachment?: { fileUri: string; fileName: string; mimeType?: string };
  }): Payment {
    this.assertHouseholdAccess(params.actorUserId, params.householdId);
    this.assertHouseholdAccess(params.paidByUserId, params.householdId);
    this.assertHouseholdAccess(params.paidToUserId, params.householdId);

    if (params.paidByUserId === params.paidToUserId) {
      throw new Error('Payer and recipient must be different roommates');
    }
    if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
      throw new Error('Payment amount must be a positive integer in paise');
    }

    const nowIso = new Date().toISOString();
    const paymentId = generateId('pay');

    const attachments: PaymentAttachment[] = params.attachment
      ? [
          {
            id: generateId('pay-att'),
            paymentId,
            fileUri: params.attachment.fileUri,
            fileName: params.attachment.fileName,
            mimeType: params.attachment.mimeType ?? 'image/jpeg',
            uploadedByUserId: params.actorUserId,
            createdAt: nowIso,
          },
        ]
      : [];

    const payment: Payment = {
      id: paymentId,
      householdId: params.householdId,
      paidByUserId: params.paidByUserId,
      paidToUserId: params.paidToUserId,
      amountPaise: params.amountPaise,
      paymentDate: nowIso,
      paymentMethod: params.paymentMethod,
      referenceId: params.referenceId?.trim() || undefined,
      note: params.note?.trim() || undefined,
      status: params.status ?? 'confirmed',
      createdByUserId: params.actorUserId,
      attachments,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.state.payments.unshift(payment);

    const payerName = this.getUserName(params.paidByUserId);
    const recipientName = this.getUserName(params.paidToUserId);

    this.state.activityLogs.unshift({
      id: generateId('act'),
      householdId: params.householdId,
      actorUserId: params.actorUserId,
      actionType: 'payment_recorded',
      entityType: 'payment',
      entityId: paymentId,
      summary: `${payerName} recorded a repayment of ${formatINR(
        params.amountPaise
      )} to ${recipientName} via ${params.paymentMethod}`,
      amountPaise: params.amountPaise,
      affectedUserIds: [params.paidByUserId, params.paidToUserId],
      createdAt: nowIso,
    });

    const targetRecipient =
      params.actorUserId === params.paidByUserId ? params.paidToUserId : params.paidByUserId;

    this.state.notifications.unshift({
      id: generateId('notif'),
      householdId: params.householdId,
      recipientUserId: targetRecipient,
      actorUserId: params.actorUserId,
      eventType: 'payment_recorded',
      title: `Payment Recorded: ${formatINR(params.amountPaise)}`,
      body: `${payerName} recorded ${formatINR(
        params.amountPaise
      )} to ${recipientName} via ${params.paymentMethod} (Manually recorded).`,
      amountPaise: params.amountPaise,
      affectsBalance: true,
      relatedEntityType: 'payment',
      relatedEntityId: paymentId,
      dedupKey: `pay-rec-${paymentId}-${targetRecipient}`,
      isRead: false,
      createdAt: nowIso,
    });

    return payment;
  }

  public updatePaymentStatus(params: {
    actorUserId: string;
    householdId: string;
    paymentId: string;
    status: PaymentStatus;
    statusNote?: string;
  }): Payment {
    this.assertHouseholdAccess(params.actorUserId, params.householdId);
    const payment = this.state.payments.find(
      (p) => p.id === params.paymentId && p.householdId === params.householdId
    );
    if (!payment) throw new Error('Payment record not found');

    const prevStatus = payment.status;
    payment.status = params.status;
    payment.statusNote = params.statusNote?.trim() || undefined;
    payment.updatedAt = new Date().toISOString();

    this.state.activityLogs.unshift({
      id: generateId('act'),
      householdId: params.householdId,
      actorUserId: params.actorUserId,
      actionType: `payment_${params.status}`,
      entityType: 'payment',
      entityId: payment.id,
      summary: `${this.getUserName(params.actorUserId)} marked payment (${formatINR(
        payment.amountPaise
      )}) as ${params.status}`,
      amountPaise: payment.amountPaise,
      affectedUserIds: [payment.paidByUserId, payment.paidToUserId],
      previousValue: { status: prevStatus },
      newValue: { status: params.status },
      reason: payment.statusNote,
      createdAt: payment.updatedAt,
    });

    return payment;
  }

  /**
   * Update household food configuration (Provider name & default meal price).
   * Rule #7 & Phase 11: Changing the default meal price applies only to newly created meals
   * and NEVER rewrites historical meal entries.
   */
  public updateHouseholdSettings(params: {
    actorUserId: string;
    householdId: string;
    name?: string;
    foodProviderName?: string;
    defaultMealPricePaise?: number;
    defaultLunchEnabled?: boolean;
    defaultDinnerEnabled?: boolean;
  }): Household {
    const member = this.assertHouseholdAccess(params.actorUserId, params.householdId);
    if (member.role !== 'admin') {
      throw new Error('Only a household admin can update household settings');
    }

    const household = this.state.households.find((h) => h.id === params.householdId);
    if (!household) throw new Error('Household not found');

    const prevPrice = household.defaultMealPricePaise;
    const prevProvider = household.foodProviderName;

    if (params.name?.trim()) household.name = params.name.trim();
    if (params.foodProviderName?.trim()) household.foodProviderName = params.foodProviderName.trim();
    if (typeof params.defaultMealPricePaise === 'number') {
      if (!Number.isInteger(params.defaultMealPricePaise) || params.defaultMealPricePaise < 0) {
        throw new Error('Default meal price must be a non-negative integer in paise');
      }
      household.defaultMealPricePaise = params.defaultMealPricePaise;
    }
    if (typeof params.defaultLunchEnabled === 'boolean') {
      household.defaultLunchEnabled = params.defaultLunchEnabled;
    }
    if (typeof params.defaultDinnerEnabled === 'boolean') {
      household.defaultDinnerEnabled = params.defaultDinnerEnabled;
    }
    household.updatedAt = new Date().toISOString();

    const openCycle = this.state.foodCycles.find(
      (c) => c.householdId === params.householdId && c.status === 'open'
    );
    if (openCycle && params.foodProviderName?.trim()) {
      openCycle.providerName = params.foodProviderName.trim();
    }

    this.state.activityLogs.unshift({
      id: generateId('act'),
      householdId: params.householdId,
      actorUserId: params.actorUserId,
      actionType: 'household_settings_updated',
      entityType: 'household',
      entityId: household.id,
      summary: `${this.getUserName(params.actorUserId)} updated household settings (Vendor: ${
        household.foodProviderName
      }, Default Meal Price: ${formatINR(household.defaultMealPricePaise)})`,
      affectedUserIds: this.state.householdMembers
        .filter((m) => m.householdId === params.householdId && m.status === 'active')
        .map((m) => m.userId),
      previousValue: { foodProviderName: prevProvider, defaultMealPricePaise: prevPrice },
      newValue: {
        foodProviderName: household.foodProviderName,
        defaultMealPricePaise: household.defaultMealPricePaise,
      },
      createdAt: household.updatedAt,
    });

    return household;
  }

  public createHousehold(params: {
    actorUserId: string;
    name: string;
    foodProviderName?: string;
    defaultMealPricePaise?: number;
  }): Household {
    if (!params.name.trim()) throw new Error('Household name is required');
    const nowIso = new Date().toISOString();
    const householdId = generateId('household');
    const inviteCode = `RS${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const household: Household = {
      id: householdId,
      name: params.name.trim(),
      inviteCode,
      foodProviderName: params.foodProviderName?.trim() || 'Rox',
      defaultMealPricePaise: params.defaultMealPricePaise ?? 8000,
      defaultLunchEnabled: true,
      defaultDinnerEnabled: true,
      createdBy: params.actorUserId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.state.households.push(household);
    this.state.householdMembers.push({
      id: generateId('hm'),
      householdId,
      userId: params.actorUserId,
      role: 'admin',
      status: 'active',
      notificationsEnabled: true,
      joinedAt: nowIso,
    });

    this.getOrCreateOpenFoodCycle(householdId, params.actorUserId);
    return household;
  }

  public joinHouseholdByInviteCode(actorUserId: string, inviteCode: string): Household {
    const cleanCode = inviteCode.trim().toUpperCase();
    const household = this.state.households.find((h) => h.inviteCode.toUpperCase() === cleanCode);
    if (!household) {
      throw new Error('Invalid household invite code');
    }

    const existing = this.state.householdMembers.find(
      (m) => m.householdId === household.id && m.userId === actorUserId
    );
    if (existing) {
      existing.status = 'active';
      return household;
    }

    this.state.householdMembers.push({
      id: generateId('hm'),
      householdId: household.id,
      userId: actorUserId,
      role: 'member',
      status: 'active',
      notificationsEnabled: true,
      joinedAt: new Date().toISOString(),
    });

    return household;
  }

  public registerOrLoginUser(params: {
    email: string;
    fullName: string;
    phone?: string;
    authProvider?: 'email' | 'google';
  }): Profile {
    const cleanEmail = params.email.trim().toLowerCase();
    const existing = this.state.profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (existing) {
      return existing;
    }

    const nowIso = new Date().toISOString();
    const profile: Profile = {
      id: generateId('user'),
      email: cleanEmail,
      fullName: params.fullName.trim() || cleanEmail.split('@')[0],
      phone: params.phone?.trim(),
      authProvider: params.authProvider ?? 'email',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.state.profiles.push(profile);
    return profile;
  }
}

export const db = new RoomSyncDatabase();
