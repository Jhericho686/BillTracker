export type WalletId = 'cash' | 'gcash' | 'maya' | 'bank';

export interface Wallet {
  id: WalletId;
  name: string;
  type: 'Cash' | 'E-Wallet' | 'Bank';
  balance: number;
  accountNumber?: string;
  color: string;
}

export type IncomeType = 'allowance' | 'salary' | 'side_hustle';

export interface IncomeEntry {
  id: string;
  title: string;
  type: IncomeType;
  amount: number;
  date: string;
  cutoff: '1st_kinsenas' | '2nd_kinsenas' | 'monthly';
  walletId: WalletId;
  status: 'received' | 'pending';
  contributor?: string;
  notes?: string;
}

export type ExpensePillar = 'need' | 'want' | 'utang_payment';

export type NeedCategory =
  | 'Palengke & Wet Market'
  | 'Supermarket & Pantry'
  | 'Bigas & Staples'
  | 'Kuryente (Electricity)'
  | 'Tubig & Water Refills'
  | 'Internet & Load'
  | 'LPG & Cooking Gas'
  | 'Rent & Housing'
  | 'Household & Toiletries'
  | 'Health & Medicine'
  | 'Transport & Gas';

export type WantCategory =
  | 'Fast Food & Delivery'
  | 'Iced Coffee & Milk Tea'
  | 'Family Eat-Out'
  | 'Shopee / Lazada / TikTok'
  | 'Subscriptions & Entertainment'
  | 'Home Upgrades & Treats';

export interface ExpenseEntry {
  id: string;
  title: string;
  amount: number;
  pillar: ExpensePillar;
  category: string;
  date: string;
  cutoff: '1st_kinsenas' | '2nd_kinsenas';
  walletId: WalletId;
  notes?: string;
  isFromGroceryChecklist?: boolean;
}

export type GroceryCategory =
  | 'Palengke (Meat, Fish, Gulay)'
  | 'Supermarket & Pantry'
  | 'Bigas & Kusina Staples'
  | 'Toiletries & Laundry'
  | 'Medicine & First Aid';

export type StockStatus = 'in_stock' | 'running_low' | 'out_of_stock';

export interface GroceryItem {
  id: string;
  name: string;
  category: GroceryCategory;
  quantity: string;
  estimatedPrice: number;
  actualPrice: number;
  lastPricePaid?: number;
  isChecked: boolean;
  pillar: 'need' | 'want';
  stockStatus: StockStatus;
}

export interface SupplyTracker {
  id: string;
  item: 'Bigas (25kg Sack)' | 'LPG Tank (11kg)' | 'Drinking Water Gallons';
  lastRefillDate: string;
  cost: number;
  estimatedDaysDuration: number;
  remainingPercent: number;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  category: WantCategory;
  addedDate: string;
  coolingOffDays: number;
  priority: 'Low' | 'Medium' | 'High';
  notes?: string;
}

export interface KuryenteBill {
  id: string;
  month: string;
  billingPeriod: string;
  mode: 'direct_meralco' | 'submeter';
  prevReading: number;
  currReading: number;
  kwhUsed: number;
  ratePerKwh: number;
  totalAmount: number;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'partial';
  paidAmount: number;
  notes?: string;
}

export interface HouseUtilityBill {
  id: string;
  type: 'Kuryente' | 'Tubig' | 'Internet / Wi-Fi' | 'LPG / Gasul' | 'Bahay / Rent / HOA';
  provider: string;
  amount: number;
  dueDate: string;
  cutoff: '1st_kinsenas' | '2nd_kinsenas';
  status: 'paid' | 'unpaid';
  lastPaidDate?: string;
}

export interface ApplianceEstimate {
  id: string;
  name: string;
  watts: number;
  hoursPerDay: number;
  daysPerMonth: number;
}

export type UtangDirection = 'utang_ko' | 'utang_nila';

export type UtangCategory =
  | 'Home Credit / Appliance'
  | 'SPayLater / LazPayLater'
  | 'Credit Card'
  | 'Billease / GLoan / Maya Credit'
  | 'Relatives / Friends'
  | 'Sari-Sari Store Lista'
  | 'Household Abono';

export interface UtangPaymentLog {
  id: string;
  date: string;
  amount: number;
  walletId: WalletId;
  note?: string;
}

export interface UtangRecord {
  id: string;
  direction: UtangDirection;
  personOrLender: string;
  category: UtangCategory;
  purpose: string;
  purposePillar: 'need' | 'want';
  totalAmount: number;
  paidAmount: number;
  monthlyInstallment: number;
  totalMonths: number;
  paidMonths: number;
  dueDate: string;
  cutoff: '1st_kinsenas' | '2nd_kinsenas';
  status: 'active' | 'paid' | 'overdue';
  contactInfo?: string;
  paymentHistory: UtangPaymentLog[];
}

export interface MonthlyHistorySnapshot {
  monthKey: string;
  monthLabel: string;
  allowanceIncome: number;
  salaryIncome: number;
  sideHustleIncome: number;
  totalIncome: number;
  groceriesAndFoodNeeds: number;
  kuryenteAmount: number;
  kuryenteKwh: number;
  kuryenteRate: number;
  tubigAndWifiNeeds: number;
  otherHouseNeeds: number;
  totalNeeds: number;
  totalWants: number;
  utangPaid: number;
  netSaved: number;
}

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'PAYMENT'
  | 'CHECKOUT'
  | 'WALLET_TRANSFER'
  | 'BILL_PAID'
  | 'SYSTEM_BACKUP';

export type AuditModule =
  | 'WALLET'
  | 'INCOME'
  | 'EXPENSE'
  | 'GROCERY'
  | 'KURYENTE'
  | 'UTANG'
  | 'BUDGET'
  | 'SYSTEM';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditActionType;
  module: AuditModule;
  summary: string;
  actor: string;
  amountDelta?: number;
  previousValue?: string;
  newValue?: string;
  walletAffected?: string;
  metadata?: Record<string, any>;
}

export interface HouseholdDatabaseState {
  monthlyAllowanceBudget: number;
  groceriesBudget: number;
  kuryenteBudget: number;
  wantsBudget: number;
  activeCutoff: '1st_kinsenas' | '2nd_kinsenas' | 'full_month';
  privacyMode: boolean;
  wallets: Wallet[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  groceries: GroceryItem[];
  supplies: SupplyTracker[];
  wishlist: WishlistItem[];
  kuryenteBills: KuryenteBill[];
  utilityBills: HouseUtilityBill[];
  appliances: ApplianceEstimate[];
  utangs: UtangRecord[];
  sixMonthHistory: MonthlyHistorySnapshot[];
  auditLogs: AuditLogEntry[];
}
