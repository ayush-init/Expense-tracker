import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityLog,
  Expense,
  ExpenseCategory,
  FoodCycle,
  FoodSettlement,
  Household,
  HouseholdMember,
  MealEntry,
  MealSkipReason,
  MealType,
  NotificationItem,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Profile,
  SplitType,
  UserBalanceSummary,
} from '../types/models';
import { DatabaseState, db } from '../services/database';
import { AuthService, AuthSession, getGoogleOAuthConfig, GoogleOAuthConfig } from '../services/authService';
import {
  calculateFoodCycleSummary,
  calculateHouseholdBalances,
  FoodCycleSummary,
} from '../utils/finance';

const DB_SNAPSHOT_STORAGE_KEY = '@roomsync/db_state_v1';

interface AppContextValue {
  isHydrated: boolean;
  session: AuthSession | null;
  currentUser: Profile | null;
  activeHousehold: Household | null;
  members: Array<HouseholdMember & { profile: Profile }>;
  expenses: Expense[];
  foodCycles: FoodCycle[];
  activeFoodCycle: FoodCycle | null;
  activeFoodCycleSummary: FoodCycleSummary | null;
  mealEntries: MealEntry[];
  foodSettlements: FoodSettlement[];
  payments: Payment[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  activityLogs: ActivityLog[];
  balances: Record<string, UserBalanceSummary>;
  myBalance: UserBalanceSummary | null;
  googleOAuthConfig: GoogleOAuthConfig;

  // Auth & Onboarding actions
  signInWithEmail: (email: string, password?: string) => Promise<void>;
  signUpWithEmail: (params: {
    email: string;
    fullName: string;
    password?: string;
    phone?: string;
  }) => Promise<void>;
  signInAsRoommate: (userId: 'user-ayush' | 'user-yuvraj' | 'user-vansh') => Promise<void>;
  signOut: () => Promise<void>;
  createHousehold: (params: {
    name: string;
    foodProviderName?: string;
    defaultMealPricePaise?: number;
  }) => Promise<Household>;
  joinHouseholdByCode: (inviteCode: string) => Promise<Household>;
  updateProfile: (params: { fullName: string; phone?: string }) => Promise<void>;

  // Expense actions
  addExpense: (params: {
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
  }) => Promise<Expense>;
  voidExpense: (expenseId: string, reason: string) => Promise<void>;

  // Food & Meal actions
  upsertMeal: (params: {
    targetUserId: string;
    mealDate: string;
    mealType: MealType;
    received: boolean;
    skipReason?: MealSkipReason;
    note?: string;
  }) => Promise<MealEntry>;
  settleFoodCycle: (params: {
    paidByUserId: string;
    amountPaise: number;
    paymentMethod: PaymentMethod;
    referenceId?: string;
    note?: string;
    proofUri?: string;
    settlementDate?: string;
  }) => Promise<void>;

  // Payment actions
  recordPayment: (params: {
    paidByUserId: string;
    paidToUserId: string;
    amountPaise: number;
    paymentMethod: PaymentMethod;
    referenceId?: string;
    note?: string;
    status?: PaymentStatus;
    attachment?: { fileUri: string; fileName: string; mimeType?: string };
  }) => Promise<Payment>;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus, statusNote?: string) => Promise<void>;

  // Settings & Notification actions
  updateHouseholdSettings: (params: {
    name?: string;
    foodProviderName?: string;
    defaultMealPricePaise?: number;
    defaultLunchEnabled?: boolean;
    defaultDinnerEnabled?: boolean;
  }) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toggleNotificationPreference: (enabled: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);
const authService = new AuthService(db);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [version, setVersion] = useState(0);

  const persistSnapshot = useCallback(async () => {
    try {
      await AsyncStorage.setItem(DB_SNAPSHOT_STORAGE_KEY, JSON.stringify(db.getSnapshot()));
    } catch {
      // Ignore storage write errors in non-persistent environments
    }
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const savedDb = await AsyncStorage.getItem(DB_SNAPSHOT_STORAGE_KEY);
        if (savedDb) {
          const parsedDb = JSON.parse(savedDb) as DatabaseState;
          if (parsedDb && Array.isArray(parsedDb.profiles)) {
            db.loadSnapshot(parsedDb);
          }
        }
        const savedSession = await authService.loadSavedSession();
        if (mounted && savedSession) {
          setSession(savedSession);
        } else if (mounted) {
          // Default to Ayush signed in for immediate seamless experience, while allowing logout/switch anytime
          const defaultSession = authService.signInAsRoommate('user-ayush');
          setSession(defaultSession);
        }
      } catch {
        // Fallback to seed state
      } finally {
        if (mounted) setIsHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const currentUser = useMemo(() => {
    if (!session) return null;
    return db.getUserProfile(session.user.id) ?? session.user;
  }, [session, version]);

  const activeHousehold = useMemo(() => {
    if (!currentUser) return null;
    const households = db.getHouseholdsForUser(currentUser.id);
    if (session?.activeHouseholdId) {
      const match = households.find((h) => h.id === session.activeHouseholdId);
      if (match) return match;
    }
    return households[0] ?? null;
  }, [currentUser, session, version]);

  const members = useMemo(() => {
    if (!currentUser || !activeHousehold) return [];
    return db.getHouseholdMembers(currentUser.id, activeHousehold.id);
  }, [currentUser, activeHousehold, version]);

  const expenses = useMemo(() => {
    if (!currentUser || !activeHousehold) return [];
    return db.getExpenses(currentUser.id, activeHousehold.id);
  }, [currentUser, activeHousehold, version]);

  const foodCycles = useMemo(() => {
    if (!currentUser || !activeHousehold) return [];
    return db
      .getSnapshot()
      .foodCycles.filter((c) => c.householdId === activeHousehold.id);
  }, [currentUser, activeHousehold, version]);

  const activeFoodCycle = useMemo(() => {
    if (!currentUser || !activeHousehold) return null;
    return db.getOrCreateOpenFoodCycle(activeHousehold.id, currentUser.id);
  }, [currentUser, activeHousehold, version]);

  const mealEntries = useMemo(() => {
    if (!currentUser || !activeHousehold) return [];
    return db
      .getSnapshot()
      .mealEntries.filter((m) => m.householdId === activeHousehold.id);
  }, [currentUser, activeHousehold, version]);

  const foodSettlements = useMemo(() => {
    if (!currentUser || !activeHousehold) return [];
    return db
      .getSnapshot()
      .foodSettlements.filter((s) => s.householdId === activeHousehold.id);
  }, [currentUser, activeHousehold, version]);

  const activeFoodCycleSummary = useMemo(() => {
    if (!activeFoodCycle) return null;
    return calculateFoodCycleSummary(
      activeFoodCycle,
      mealEntries,
      foodSettlements,
      members.map((m) => m.userId)
    );
  }, [activeFoodCycle, mealEntries, foodSettlements, members, version]);

  const payments = useMemo(() => {
    if (!currentUser || !activeHousehold) return [];
    return db
      .getSnapshot()
      .payments.filter((p) => p.householdId === activeHousehold.id);
  }, [currentUser, activeHousehold, version]);

  const notifications = useMemo(() => {
    if (!currentUser || !activeHousehold) return [];
    return db
      .getSnapshot()
      .notifications.filter(
        (n) => n.householdId === activeHousehold.id && n.recipientUserId === currentUser.id
      );
  }, [currentUser, activeHousehold, version]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const activityLogs = useMemo(() => {
    if (!currentUser || !activeHousehold) return [];
    return db
      .getSnapshot()
      .activityLogs.filter((a) => a.householdId === activeHousehold.id);
  }, [currentUser, activeHousehold, version]);

  const balances = useMemo(() => {
    if (!currentUser || !activeHousehold) return {};
    return calculateHouseholdBalances({
      memberUserIds: members.map((m) => m.userId),
      expenses,
      payments,
      foodCycles,
      mealEntries,
      foodSettlements,
    });
  }, [currentUser, activeHousehold, members, expenses, payments, foodCycles, mealEntries, foodSettlements]);

  const myBalance = useMemo(() => {
    if (!currentUser) return null;
    return balances[currentUser.id] ?? null;
  }, [balances, currentUser]);

  const signInWithEmail = useCallback(async (email: string, password?: string) => {
    const nextSession = authService.signInWithEmail(email, password);
    setSession(nextSession);
    await authService.saveSession(nextSession);
    setVersion((v) => v + 1);
  }, []);

  const signUpWithEmail = useCallback(
    async (params: { email: string; fullName: string; password?: string; phone?: string }) => {
      const nextSession = authService.signUpWithEmail(params);
      setSession(nextSession);
      await authService.saveSession(nextSession);
      await persistSnapshot();
    },
    [persistSnapshot]
  );

  const signInAsRoommate = useCallback(
    async (userId: 'user-ayush' | 'user-yuvraj' | 'user-vansh') => {
      const nextSession = authService.signInAsRoommate(userId);
      setSession(nextSession);
      await authService.saveSession(nextSession);
      setVersion((v) => v + 1);
    },
    []
  );

  const signOut = useCallback(async () => {
    setSession(null);
    await authService.saveSession(null);
    setVersion((v) => v + 1);
  }, []);

  const createHousehold = useCallback(
    async (params: { name: string; foodProviderName?: string; defaultMealPricePaise?: number }) => {
      if (!currentUser) throw new Error('Must be signed in');
      const created = db.createHousehold({
        actorUserId: currentUser.id,
        ...params,
      });
      const updatedSession: AuthSession = {
        user: currentUser,
        activeHouseholdId: created.id,
        signedInAt: new Date().toISOString(),
      };
      setSession(updatedSession);
      await authService.saveSession(updatedSession);
      await persistSnapshot();
      return created;
    },
    [currentUser, persistSnapshot]
  );

  const joinHouseholdByCode = useCallback(
    async (inviteCode: string) => {
      if (!currentUser) throw new Error('Must be signed in');
      const joined = db.joinHouseholdByInviteCode(currentUser.id, inviteCode);
      const updatedSession: AuthSession = {
        user: currentUser,
        activeHouseholdId: joined.id,
        signedInAt: new Date().toISOString(),
      };
      setSession(updatedSession);
      await authService.saveSession(updatedSession);
      await persistSnapshot();
      return joined;
    },
    [currentUser, persistSnapshot]
  );

  const updateProfile = useCallback(
    async (params: { fullName: string; phone?: string }) => {
      if (!currentUser) throw new Error('Must be signed in');
      const profile = db.getUserProfile(currentUser.id);
      if (!profile) throw new Error('Profile not found');
      if (params.fullName.trim()) profile.fullName = params.fullName.trim();
      profile.phone = params.phone?.trim() || undefined;
      profile.updatedAt = new Date().toISOString();
      await persistSnapshot();
    },
    [currentUser, persistSnapshot]
  );

  const addExpense = useCallback(
    async (params: {
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
    }) => {
      if (!currentUser || !activeHousehold) throw new Error('No active household');
      const created = db.createExpense({
        actorUserId: currentUser.id,
        householdId: activeHousehold.id,
        ...params,
      });
      await persistSnapshot();
      return created;
    },
    [currentUser, activeHousehold, persistSnapshot]
  );

  const voidExpense = useCallback(
    async (expenseId: string, reason: string) => {
      if (!currentUser || !activeHousehold) throw new Error('No active household');
      db.voidExpense({
        actorUserId: currentUser.id,
        householdId: activeHousehold.id,
        expenseId,
        reason,
      });
      await persistSnapshot();
    },
    [currentUser, activeHousehold, persistSnapshot]
  );

  const upsertMeal = useCallback(
    async (params: {
      targetUserId: string;
      mealDate: string;
      mealType: MealType;
      received: boolean;
      skipReason?: MealSkipReason;
      note?: string;
    }) => {
      if (!currentUser || !activeHousehold) throw new Error('No active household');
      const entry = db.upsertMealEntry({
        actorUserId: currentUser.id,
        householdId: activeHousehold.id,
        ...params,
      });
      await persistSnapshot();
      return entry;
    },
    [currentUser, activeHousehold, persistSnapshot]
  );

  const settleFoodCycle = useCallback(
    async (params: {
      paidByUserId: string;
      amountPaise: number;
      paymentMethod: PaymentMethod;
      referenceId?: string;
      note?: string;
      proofUri?: string;
      settlementDate?: string;
    }) => {
      if (!currentUser || !activeHousehold) throw new Error('No active household');
      db.recordFoodSettlement({
        actorUserId: currentUser.id,
        householdId: activeHousehold.id,
        ...params,
      });
      await persistSnapshot();
    },
    [currentUser, activeHousehold, persistSnapshot]
  );

  const recordPayment = useCallback(
    async (params: {
      paidByUserId: string;
      paidToUserId: string;
      amountPaise: number;
      paymentMethod: PaymentMethod;
      referenceId?: string;
      note?: string;
      status?: PaymentStatus;
      attachment?: { fileUri: string; fileName: string; mimeType?: string };
    }) => {
      if (!currentUser || !activeHousehold) throw new Error('No active household');
      const created = db.recordPayment({
        actorUserId: currentUser.id,
        householdId: activeHousehold.id,
        ...params,
      });
      await persistSnapshot();
      return created;
    },
    [currentUser, activeHousehold, persistSnapshot]
  );

  const updatePaymentStatus = useCallback(
    async (paymentId: string, status: PaymentStatus, statusNote?: string) => {
      if (!currentUser || !activeHousehold) throw new Error('No active household');
      db.updatePaymentStatus({
        actorUserId: currentUser.id,
        householdId: activeHousehold.id,
        paymentId,
        status,
        statusNote,
      });
      await persistSnapshot();
    },
    [currentUser, activeHousehold, persistSnapshot]
  );

  const updateHouseholdSettings = useCallback(
    async (params: {
      name?: string;
      foodProviderName?: string;
      defaultMealPricePaise?: number;
      defaultLunchEnabled?: boolean;
      defaultDinnerEnabled?: boolean;
    }) => {
      if (!currentUser || !activeHousehold) throw new Error('No active household');
      db.updateHouseholdSettings({
        actorUserId: currentUser.id,
        householdId: activeHousehold.id,
        ...params,
      });
      await persistSnapshot();
    },
    [currentUser, activeHousehold, persistSnapshot]
  );

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      const target = db.getSnapshot().notifications.find((n) => n.id === notificationId);
      if (target) {
        target.isRead = true;
        await persistSnapshot();
      }
    },
    [persistSnapshot]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!currentUser) return;
    for (const n of db.getSnapshot().notifications) {
      if (n.recipientUserId === currentUser.id) {
        n.isRead = true;
      }
    }
    await persistSnapshot();
  }, [currentUser, persistSnapshot]);

  const toggleNotificationPreference = useCallback(
    async (enabled: boolean) => {
      if (!currentUser || !activeHousehold) return;
      const member = db
        .getSnapshot()
        .householdMembers.find(
          (m) => m.householdId === activeHousehold.id && m.userId === currentUser.id
        );
      if (member) {
        member.notificationsEnabled = enabled;
        await persistSnapshot();
      }
    },
    [currentUser, activeHousehold, persistSnapshot]
  );

  const refreshData = useCallback(async () => {
    setVersion((v) => v + 1);
  }, []);

  const value: AppContextValue = {
    isHydrated,
    session,
    currentUser,
    activeHousehold,
    members,
    expenses,
    foodCycles,
    activeFoodCycle,
    activeFoodCycleSummary,
    mealEntries,
    foodSettlements,
    payments,
    notifications,
    unreadNotificationCount,
    activityLogs,
    balances,
    myBalance,
    googleOAuthConfig: getGoogleOAuthConfig(),
    signInWithEmail,
    signUpWithEmail,
    signInAsRoommate,
    signOut,
    createHousehold,
    joinHouseholdByCode,
    updateProfile,
    addExpense,
    voidExpense,
    upsertMeal,
    settleFoodCycle,
    recordPayment,
    updatePaymentStatus,
    updateHouseholdSettings,
    markNotificationRead,
    markAllNotificationsRead,
    toggleNotificationPreference,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return ctx;
}
