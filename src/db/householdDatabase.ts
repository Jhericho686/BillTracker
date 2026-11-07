import { HouseholdDatabaseState } from '../types/database';
import { syncStateToFirebase } from './firebase';

const STORAGE_KEY = 'bills_tracker_db_fresh_v2';

export const INITIAL_HOUSEHOLD_DB: HouseholdDatabaseState = {
  monthlyAllowanceBudget: 0,
  groceriesBudget: 0,
  kuryenteBudget: 0,
  wantsBudget: 0,
  activeCutoff: 'full_month',
  privacyMode: false,

  wallets: [
    {
      id: 'cash',
      name: 'House Cash Envelope',
      type: 'Cash',
      balance: 0,
      accountNumber: 'Cash on Hand',
      color: '#10b981',
    },
    {
      id: 'gcash',
      name: 'GCash',
      type: 'E-Wallet',
      balance: 0,
      accountNumber: 'GCash Wallet',
      color: '#2563eb',
    },
    {
      id: 'maya',
      name: 'Maya',
      type: 'E-Wallet',
      balance: 0,
      accountNumber: 'Maya Wallet',
      color: '#059669',
    },
    {
      id: 'bank',
      name: 'Bank Account',
      type: 'Bank',
      balance: 0,
      accountNumber: 'Savings / Payroll',
      color: '#0284c7',
    },
  ],

  incomes: [],
  expenses: [],
  groceries: [],
  supplies: [],
  wishlist: [],
  kuryenteBills: [],
  utilityBills: [],
  appliances: [],
  utangs: [],
  sixMonthHistory: [],
  auditLogs: [],
};

function cloneInitialDB(): HouseholdDatabaseState {
  return JSON.parse(JSON.stringify(INITIAL_HOUSEHOLD_DB));
}

export function loadHouseholdDB(): HouseholdDatabaseState {
  try {
    // Clear legacy demo keys if present
    localStorage.removeItem('bahay_budget_db_v1');
    localStorage.removeItem('bills_tracker_db_clean_v1');

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = cloneInitialDB();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<HouseholdDatabaseState>;
    const fallback = cloneInitialDB();
    return {
      ...fallback,
      ...parsed,
      wallets: Array.isArray(parsed.wallets) && parsed.wallets.length > 0 ? parsed.wallets : fallback.wallets,
      incomes: Array.isArray(parsed.incomes) ? parsed.incomes : fallback.incomes,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : fallback.expenses,
      groceries: Array.isArray(parsed.groceries) ? parsed.groceries : fallback.groceries,
      supplies: Array.isArray(parsed.supplies) ? parsed.supplies : fallback.supplies,
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : fallback.wishlist,
      kuryenteBills: Array.isArray(parsed.kuryenteBills) ? parsed.kuryenteBills : fallback.kuryenteBills,
      utilityBills: Array.isArray(parsed.utilityBills) ? parsed.utilityBills : fallback.utilityBills,
      appliances: Array.isArray(parsed.appliances) ? parsed.appliances : fallback.appliances,
      utangs: Array.isArray(parsed.utangs) ? parsed.utangs : fallback.utangs,
      sixMonthHistory: Array.isArray(parsed.sixMonthHistory)
        ? parsed.sixMonthHistory
        : fallback.sixMonthHistory,
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : fallback.auditLogs,
    };
  } catch (error) {
    console.error('Failed to load household database from localStorage, falling back to clean state:', error);
    return cloneInitialDB();
  }
}

export function saveHouseholdDB(state: HouseholdDatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // 1. Cloud sync to Firebase Firestore (billstracker-46723)
    syncStateToFirebase(state);

    // 2. Non-blocking background sync to local XAMPP MySQL server (bahayglass_db)
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('http://localhost:8080/api.php?endpoint=sync_state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(() => {
        // Offline / XAMPP stopped fallback: localStorage + Firebase remain authoritative
      });
    }
  } catch (error) {
    console.error('Failed to save household database to localStorage:', error);
  }
}

export function resetHouseholdDB(): HouseholdDatabaseState {
  const fresh = cloneInitialDB();
  saveHouseholdDB(fresh);
  return fresh;
}

export function exportDatabaseJSON(state: HouseholdDatabaseState): string {
  return JSON.stringify(state, null, 2);
}
