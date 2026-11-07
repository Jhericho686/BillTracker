import React, { useState, useMemo } from 'react';
import {
  ShoppingBasket,
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Package,
  Droplets,
  Flame,
  Wheat,
  ShoppingCart,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Trash2,
  Wallet,
  Filter,
  ArrowRight,
  RefreshCw,
  Utensils,
  Coffee,
  ShoppingBag,
  Home,
  Check,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  HouseholdDatabaseState,
  GroceryItem,
  GroceryCategory,
  StockStatus,
  WalletId,
  ExpenseEntry,
  WishlistItem,
  NeedCategory,
  WantCategory,
} from '../types/database';
import { calculateHouseholdDashboardMetrics } from '../services/householdEngine';
import {
  GlassCard,
  GlassButton,
  GlassBadge,
  GlassProgressBar,
  GlassModal,
  GlassSectionHeader,
  formatPeso,
} from './ui/GlassComponents';

export interface NeedsGroceriesWantsViewProps {
  db: HouseholdDatabaseState;
  privacyMode: boolean;
  onToggleGroceryCheck: (id: string) => void;
  onUpdateGroceryPrice: (id: string, actualPrice: number) => void;
  onUpdateGroceryStock: (id: string, stockStatus: StockStatus) => void;
  onAddGroceryItem: (item: Omit<GroceryItem, 'id' | 'isChecked'>) => void;
  onDeleteGroceryItem: (id: string) => void;
  onCheckoutGroceries: (walletId: WalletId) => void;
  onLoadGroceryTemplate: (
    templateName: 'palengke_weekly' | 'supermarket_pantry' | 'toiletries_restock'
  ) => void;
  onRefillSupply: (supplyId: string, walletId: WalletId, cost: number) => void;
  onAddExpense: (expense: Omit<ExpenseEntry, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onAddWishlistItem: (item: Omit<WishlistItem, 'id' | 'addedDate'>) => void;
  onConvertWishlistToExpense: (wishlistId: string, walletId: WalletId) => void;
  onDeleteWishlistItem: (wishlistId: string) => void;
}

const NEED_CATEGORIES: NeedCategory[] = [
  'Palengke & Wet Market',
  'Supermarket & Pantry',
  'Bigas & Staples',
  'Kuryente (Electricity)',
  'Tubig & Water Refills',
  'Internet & Load',
  'LPG & Cooking Gas',
  'Rent & Housing',
  'Household & Toiletries',
  'Health & Medicine',
  'Transport & Gas',
];

const WANT_CATEGORIES: WantCategory[] = [
  'Fast Food & Delivery',
  'Iced Coffee & Milk Tea',
  'Family Eat-Out',
  'Shopee / Lazada / TikTok',
  'Subscriptions & Entertainment',
  'Home Upgrades & Treats',
];

const GROCERY_CATEGORIES: GroceryCategory[] = [
  'Palengke (Meat, Fish, Gulay)',
  'Supermarket & Pantry',
  'Bigas & Kusina Staples',
  'Toiletries & Laundry',
  'Medicine & First Aid',
];

type SubTab = 'checklist' | 'breakdown' | 'wishlist';
type StockFilter = 'all' | 'cart' | 'out_of_stock' | 'running_low' | 'in_stock';

const STOCK_CYCLE: StockStatus[] = ['in_stock', 'running_low', 'out_of_stock'];

export const NeedsGroceriesWantsView: React.FC<NeedsGroceriesWantsViewProps> = ({
  db,
  privacyMode,
  onToggleGroceryCheck,
  onUpdateGroceryPrice,
  onUpdateGroceryStock,
  onAddGroceryItem,
  onDeleteGroceryItem,
  onCheckoutGroceries,
  onLoadGroceryTemplate,
  onRefillSupply,
  onAddExpense,
  onDeleteExpense,
  onAddWishlistItem,
  onConvertWishlistToExpense,
  onDeleteWishlistItem,
}) => {
  const metrics = useMemo(() => calculateHouseholdDashboardMetrics(db), [db]);

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('checklist');

  // Stock & Category filters for Checklist
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [groceryCategoryFilter, setGroceryCategoryFilter] = useState<string>('ALL');
  const [checkoutWalletId, setCheckoutWalletId] = useState<WalletId>('cash');

  // Expense Breakdown filter
  const [expenseFilterPillar, setExpenseFilterPillar] = useState<'all' | 'need' | 'want'>('all');

  // Quick Log Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expPillar, setExpPillar] = useState<'need' | 'want'>('need');
  const [expCategory, setExpCategory] = useState<string>(NEED_CATEGORIES[0]);
  const [expCutoff, setExpCutoff] = useState<'1st_kinsenas' | '2nd_kinsenas'>(
    db.activeCutoff === '2nd_kinsenas' ? '2nd_kinsenas' : '1st_kinsenas'
  );
  const [expWalletId, setExpWalletId] = useState<WalletId>('cash');
  const [expNotes, setExpNotes] = useState('');

  // Add Grocery Item Modal State
  const [isAddGroceryOpen, setIsAddGroceryOpen] = useState(false);
  const [gName, setGName] = useState('');
  const [gCategory, setGCategory] = useState<GroceryCategory>(GROCERY_CATEGORIES[0]);
  const [gQuantity, setGQuantity] = useState('1 pc / pack');
  const [gEstPrice, setGEstPrice] = useState('');
  const [gPillar, setGPillar] = useState<'need' | 'want'>('need');
  const [gStock, setGStock] = useState<StockStatus>('out_of_stock');

  // Supply Refill Modal State
  const [refillTargetId, setRefillTargetId] = useState<string | null>(null);
  const [refillCost, setRefillCost] = useState('');
  const [refillWalletId, setRefillWalletId] = useState<WalletId>('cash');

  // Wishlist Modal & Buy Wallet State
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [wName, setWName] = useState('');
  const [wPrice, setWPrice] = useState('');
  const [wCategory, setWCategory] = useState<WantCategory>(WANT_CATEGORIES[0]);
  const [wCoolingDays, setWCoolingDays] = useState('7');
  const [wPriority, setWPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [wNotes, setWNotes] = useState('');
  const [wishlistBuyWallet, setWishlistBuyWallet] = useState<WalletId>('gcash');

  // Ratio & Budget Calculations
  const totalNeedsSpent = metrics.expensesByPillar.needs;
  const totalWantsSpent = metrics.expensesByPillar.wants;
  const combinedNeedsAndWants = Math.max(1, totalNeedsSpent + totalWantsSpent);
  const needsRatioPct = Math.round((totalNeedsSpent / combinedNeedsAndWants) * 100);
  const wantsRatioPct = 100 - needsRatioPct;

  const remainingWantsBudget = Math.max(0, db.wantsBudget - totalWantsSpent);
  const isWantsOverBudget = totalWantsSpent > db.wantsBudget;

  // Filtered Groceries
  const filteredGroceries = useMemo(() => {
    return db.groceries.filter((item) => {
      if (stockFilter === 'cart' && !item.isChecked) return false;
      if (stockFilter === 'out_of_stock' && item.stockStatus !== 'out_of_stock') return false;
      if (stockFilter === 'running_low' && item.stockStatus !== 'running_low') return false;
      if (stockFilter === 'in_stock' && item.stockStatus !== 'in_stock') return false;

      if (groceryCategoryFilter !== 'ALL' && item.category !== groceryCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [db.groceries, stockFilter, groceryCategoryFilter]);

  const checkedCount = useMemo(
    () => db.groceries.filter((g) => g.isChecked).length,
    [db.groceries]
  );

  // Filtered Household Expenses (Needs & Wants)
  const filteredExpenses = useMemo(() => {
    return db.expenses
      .filter((e) => e.pillar === 'need' || e.pillar === 'want')
      .filter((e) => (expenseFilterPillar === 'all' ? true : e.pillar === expenseFilterPillar));
  }, [db.expenses, expenseFilterPillar]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, { category: string; pillar: 'need' | 'want'; total: number; count: number }>();
    for (const exp of db.expenses) {
      if (exp.pillar !== 'need' && exp.pillar !== 'want') continue;
      const existing = map.get(exp.category);
      if (existing) {
        existing.total += exp.amount;
        existing.count += 1;
      } else {
        map.set(exp.category, {
          category: exp.category,
          pillar: exp.pillar,
          total: exp.amount,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [db.expenses]);

  const handleOpenExpenseModal = (defaultPillar: 'need' | 'want') => {
    setExpPillar(defaultPillar);
    setExpCategory(defaultPillar === 'need' ? NEED_CATEGORIES[0] : WANT_CATEGORIES[0]);
    setIsExpenseModalOpen(true);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(expAmount);
    if (!expTitle.trim() || isNaN(numericAmount) || numericAmount <= 0) return;

    onAddExpense({
      title: expTitle.trim(),
      amount: numericAmount,
      pillar: expPillar,
      category: expCategory,
      date: new Date().toISOString().split('T')[0],
      cutoff: expCutoff,
      walletId: expWalletId,
      notes: expNotes.trim() || undefined,
    });

    setExpTitle('');
    setExpAmount('');
    setExpNotes('');
    setIsExpenseModalOpen(false);
  };

  const handleSubmitGroceryItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(gEstPrice);
    if (!gName.trim() || isNaN(price) || price <= 0) return;

    onAddGroceryItem({
      name: gName.trim(),
      category: gCategory,
      quantity: gQuantity.trim() || '1 pc',
      estimatedPrice: price,
      actualPrice: price,
      lastPricePaid: price,
      pillar: gPillar,
      stockStatus: gStock,
    });

    setGName('');
    setGEstPrice('');
    setIsAddGroceryOpen(false);
  };

  const handleOpenRefill = (supplyId: string, defaultCost: number) => {
    setRefillTargetId(supplyId);
    setRefillCost(String(defaultCost));
    setRefillWalletId('cash');
  };

  const handleConfirmRefill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillTargetId) return;
    const cost = parseFloat(refillCost);
    if (isNaN(cost) || cost <= 0) return;
    onRefillSupply(refillTargetId, refillWalletId, cost);
    setRefillTargetId(null);
  };

  const handleSubmitWishlist = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(wPrice);
    const cooling = parseInt(wCoolingDays, 10) || 7;
    if (!wName.trim() || isNaN(price) || price <= 0) return;

    onAddWishlistItem({
      name: wName.trim(),
      price,
      category: wCategory,
      coolingOffDays: cooling,
      priority: wPriority,
      notes: wNotes.trim() || undefined,
    });

    setWName('');
    setWPrice('');
    setWNotes('');
    setIsWishlistModalOpen(false);
  };

  const getSupplyIcon = (itemName: string) => {
    if (itemName.includes('Bigas')) return <Wheat className="w-6 h-6 text-emerald-300" />;
    if (itemName.includes('LPG')) return <Flame className="w-6 h-6 text-amber-300" />;
    return <Droplets className="w-6 h-6 text-teal-300" />;
  };

  const getShortSupplyTitle = (itemName: string) => {
    if (itemName.toLowerCase().includes('bigas')) return 'Bigas 25kg';
    if (itemName.toLowerCase().includes('lpg')) return 'LPG 11kg';
    if (itemName.toLowerCase().includes('water') || itemName.toLowerCase().includes('tubig')) {
      return 'Water Gallons';
    }
    return itemName;
  };

  const cycleStockStatus = (item: GroceryItem) => {
    const idx = STOCK_CYCLE.indexOf(item.stockStatus);
    const next = STOCK_CYCLE[(idx + 1) % STOCK_CYCLE.length];
    onUpdateGroceryStock(item.id, next);
  };

  const getStockLabel = (status: StockStatus) => {
    if (status === 'in_stock') return 'In Stock';
    if (status === 'running_low') return 'Low';
    return 'Out';
  };

  return (
    <div className="space-y-6 pb-28">
      {/* 1. TOP SUMMARY CARDS (NEEDS VS. WANTS) */}
      <GlassCard glowColor="teal" className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-400/30 text-teal-300">
              <ShoppingBasket className="w-6 h-6" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Needs & Wants
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <GlassButton
              variant="primary"
              size="md"
              className="min-h-[44px]"
              onClick={() => handleOpenExpenseModal('need')}
            >
              <Plus className="w-4 h-4" />
              + Need
            </GlassButton>
            <GlassButton
              variant="amber"
              size="md"
              className="min-h-[44px]"
              onClick={() => handleOpenExpenseModal('want')}
            >
              <Plus className="w-4 h-4" />
              + Want
            </GlassButton>
          </div>
        </div>

        {/* 3 Huge Number Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Needs Spent */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/25 border border-emerald-400/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Home className="w-4 h-4" />
                Needs Spent
              </span>
              <GlassBadge tone="emerald">{needsRatioPct}%</GlassBadge>
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-slate-100">
              {formatPeso(totalNeedsSpent, privacyMode)}
            </p>
          </div>

          {/* Wants Spent */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/25 border border-amber-400/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Coffee className="w-4 h-4" />
                Wants Spent
              </span>
              <GlassBadge tone={isWantsOverBudget ? 'rose' : 'amber'}>{wantsRatioPct}%</GlassBadge>
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-slate-100">
              {formatPeso(totalWantsSpent, privacyMode)}
            </p>
          </div>

          {/* Grocery Budget Left */}
          <div className="p-4 sm:p-5 rounded-2xl bg-teal-950/25 border border-teal-400/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4" />
                Grocery Budget Left
              </span>
              <GlassBadge tone={metrics.remainingGroceryBudget > 0 ? 'teal' : 'rose'}>
                {formatPeso(db.groceriesBudget, privacyMode)} Cap
              </GlassBadge>
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-teal-300">
              {formatPeso(metrics.remainingGroceryBudget, privacyMode)}
            </p>
          </div>
        </div>

        {/* Thick Visual Split Bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-emerald-300">Needs {needsRatioPct}%</span>
            <span className="text-amber-300">Wants {wantsRatioPct}%</span>
          </div>
          <div className="h-5 w-full rounded-full bg-slate-950/90 border border-white/[0.12] overflow-hidden flex p-0.5">
            <div
              style={{ width: `${needsRatioPct}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-500"
            />
            <div
              style={{ width: `${wantsRatioPct}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-rose-400 rounded-r-full transition-all duration-500"
            />
          </div>
        </div>
      </GlassCard>

      {/* SUB-NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveSubTab('checklist')}
          className={`flex-1 min-w-[160px] min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'checklist'
              ? 'bg-gradient-to-r from-teal-500/85 to-emerald-500/85 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Grocery Checklist</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black tabular-nums ${
              activeSubTab === 'checklist'
                ? 'bg-slate-950/25 text-slate-950'
                : 'bg-teal-500/20 text-teal-300'
            }`}
          >
            {db.groceries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('breakdown')}
          className={`flex-1 min-w-[160px] min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'breakdown'
              ? 'bg-gradient-to-r from-teal-500/85 to-emerald-500/85 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expense Feed</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black tabular-nums ${
              activeSubTab === 'breakdown'
                ? 'bg-slate-950/25 text-slate-950'
                : 'bg-white/[0.1] text-slate-300'
            }`}
          >
            {db.expenses.filter((e) => e.pillar === 'need' || e.pillar === 'want').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('wishlist')}
          className={`flex-1 min-w-[160px] min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'wishlist'
              ? 'bg-gradient-to-r from-amber-500/85 to-orange-500/85 text-slate-950 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Budol Guard</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-black tabular-nums ${
              activeSubTab === 'wishlist'
                ? 'bg-slate-950/25 text-slate-950'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {db.wishlist.length}
          </span>
        </button>
      </div>

      {/* =====================================================================
          SUB-TAB 1: KUSINA TRACKERS & GROCERY CHECKLIST
         ===================================================================== */}
      {activeSubTab === 'checklist' && (
        <div className="space-y-6">
          {/* 2. KUSINA SUPPLY TRACKERS (BIGAS, LPG, TUBIG) */}
          <div>
            <GlassSectionHeader
              title="Kusina Supplies"
              icon={<Package className="w-5 h-5" />}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {db.supplies.map((supply) => {
                const daysLeft = Math.max(
                  1,
                  Math.round((supply.remainingPercent / 100) * supply.estimatedDaysDuration)
                );
                const tone =
                  supply.remainingPercent <= 25
                    ? 'rose'
                    : supply.remainingPercent <= 45
                    ? 'amber'
                    : 'emerald';

                return (
                  <GlassCard
                    key={supply.id}
                    glowColor={tone}
                    className="p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-white/[0.06] border border-white/[0.12]">
                          {getSupplyIcon(supply.item)}
                        </div>
                        <h3 className="text-base font-bold text-slate-100">
                          {getShortSupplyTitle(supply.item)}
                        </h3>
                      </div>
                      <GlassBadge tone={tone} className="text-xs font-black tabular-nums px-2.5 py-1">
                        {daysLeft}d left
                      </GlassBadge>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-4xl font-black tabular-nums text-slate-100">
                        {supply.remainingPercent}%
                      </span>
                      <span className="text-xs font-semibold text-slate-400 tabular-nums">
                        {formatPeso(supply.cost, privacyMode)}
                      </span>
                    </div>

                    <GlassProgressBar
                      value={supply.remainingPercent}
                      max={100}
                      tone={tone}
                      height="md"
                    />

                    <GlassButton
                      variant="secondary"
                      size="md"
                      className="w-full min-h-[44px]"
                      onClick={() => handleOpenRefill(supply.id, supply.cost)}
                    >
                      <RefreshCw className="w-4 h-4 text-teal-300" />
                      Refill
                    </GlassButton>
                  </GlassCard>
                );
              })}
            </div>
          </div>

          {/* Quick Templates + Filter Bar */}
          <GlassCard className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => onLoadGroceryTemplate('palengke_weekly')}
                >
                  <Utensils className="w-4 h-4 text-teal-300" />
                  Palengke Pack
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => onLoadGroceryTemplate('supermarket_pantry')}
                >
                  <Package className="w-4 h-4 text-amber-300" />
                  Pantry Pack
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => onLoadGroceryTemplate('toiletries_restock')}
                >
                  <Droplets className="w-4 h-4 text-indigo-300" />
                  Toiletries Pack
                </GlassButton>
              </div>

              <GlassButton
                variant="primary"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setIsAddGroceryOpen(true)}
              >
                <Plus className="w-4 h-4" />
                + Item
              </GlassButton>
            </div>

            {/* Stock Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: `All (${db.groceries.length})` },
                  { id: 'cart', label: `Cart (${checkedCount})` },
                  {
                    id: 'out_of_stock',
                    label: `Out (${
                      db.groceries.filter((g) => g.stockStatus === 'out_of_stock').length
                    })`,
                  },
                  {
                    id: 'running_low',
                    label: `Low (${
                      db.groceries.filter((g) => g.stockStatus === 'running_low').length
                    })`,
                  },
                  {
                    id: 'in_stock',
                    label: `In Stock (${
                      db.groceries.filter((g) => g.stockStatus === 'in_stock').length
                    })`,
                  },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStockFilter(pill.id as StockFilter)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer tabular-nums ${
                      stockFilter === pill.id
                        ? 'bg-teal-500/20 text-teal-200 border-teal-400/40 shadow-sm'
                        : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-slate-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Category Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={groceryCategoryFilter}
                  onChange={(e) => setGroceryCategoryFilter(e.target.value)}
                  className="min-h-[40px] rounded-xl bg-slate-900/90 border border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-teal-400"
                >
                  <option value="ALL">All Categories</option>
                  {GROCERY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </GlassCard>

          {/* 3. INTERACTIVE GROCERY CHECKLIST */}
          <div className="space-y-2.5">
            {filteredGroceries.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <p className="text-sm font-bold text-slate-300">No items found</p>
              </GlassCard>
            ) : (
              filteredGroceries.map((item) => {
                const priceDiff =
                  typeof item.lastPricePaid === 'number'
                    ? item.actualPrice - item.lastPricePaid
                    : 0;

                return (
                  <GlassCard
                    key={item.id}
                    glowColor={
                      item.isChecked
                        ? item.pillar === 'want'
                          ? 'amber'
                          : 'emerald'
                        : 'none'
                    }
                    className={`p-3.5 sm:p-4 transition-all ${
                      item.isChecked ? 'bg-teal-950/25' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: 44x44 Tap Target Checkbox + Bold Name */}
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onToggleGroceryCheck(item.id)}
                          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-teal-300 hover:bg-white/[0.06] transition-transform active:scale-90 cursor-pointer"
                          aria-label={item.isChecked ? 'Uncheck item' : 'Check item'}
                        >
                          {item.isChecked ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-500/20" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-500 hover:text-slate-300" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              onClick={() => onToggleGroceryCheck(item.id)}
                              className={`text-base font-bold cursor-pointer ${
                                item.isChecked ? 'text-emerald-200' : 'text-slate-100'
                              }`}
                            >
                              {item.name}
                            </span>
                            <GlassBadge tone="slate">{item.quantity}</GlassBadge>
                            <GlassBadge tone={item.pillar === 'need' ? 'emerald' : 'amber'}>
                              {item.pillar === 'need' ? 'Need' : 'Want'}
                            </GlassBadge>
                          </div>
                        </div>
                      </div>

                      {/* Right: 1-Tap Stock Pill + Diff Badge + Big Price */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pl-12 sm:pl-0">
                        {/* 1-Tap Stock Pill */}
                        <button
                          type="button"
                          onClick={() => cycleStockStatus(item)}
                          className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            item.stockStatus === 'out_of_stock'
                              ? 'bg-rose-500/15 text-rose-200 border-rose-400/35'
                              : item.stockStatus === 'running_low'
                              ? 'bg-amber-500/15 text-amber-200 border-amber-400/35'
                              : 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35'
                          }`}
                        >
                          {getStockLabel(item.stockStatus)}
                        </button>

                        {/* Compact Diff Badge */}
                        {priceDiff !== 0 && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold tabular-nums border ${
                              priceDiff > 0
                                ? 'bg-rose-500/15 text-rose-300 border-rose-400/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                            }`}
                          >
                            {priceDiff > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {priceDiff > 0 ? `+₱${priceDiff}` : `-₱${Math.abs(priceDiff)}`}
                          </span>
                        )}

                        {/* Big Price Input & Display */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg sm:text-xl font-extrabold text-slate-400">
                            ₱
                          </span>
                          <input
                            type="number"
                            min={0}
                            step="1"
                            value={item.actualPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              onUpdateGroceryPrice(item.id, isNaN(val) ? 0 : val);
                            }}
                            className="w-24 min-h-[40px] rounded-xl bg-slate-950/80 border border-white/[0.15] px-2.5 py-1 text-lg sm:text-xl font-extrabold tabular-nums text-right text-slate-100 focus:outline-none focus:border-teal-400"
                          />
                        </div>

                        {/* Delete Grocery Item Button */}
                        <button
                          type="button"
                          onClick={() => onDeleteGroceryItem(item.id)}
                          aria-label={`Delete ${item.name}`}
                          title={`Delete ${item.name}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-400/25 transition-all active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>

          {/* Sticky Bottom Cart Bar */}
          <div className="sticky bottom-4 z-30">
            <GlassCard
              glowColor={
                metrics.checkedGroceryCartTotal > metrics.remainingGroceryBudget
                  ? 'rose'
                  : 'emerald'
              }
              className="p-4 sm:p-5 bg-slate-950/95 backdrop-blur-xl border border-teal-400/30 shadow-2xl"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Cart Total ({checkedCount})
                    </span>
                    <span className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-300">
                      {formatPeso(metrics.checkedGroceryCartTotal, privacyMode)}
                    </span>
                  </div>

                  <div className="h-10 w-px bg-white/[0.1] hidden sm:block" />

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Budget Left
                    </span>
                    <span
                      className={`text-2xl sm:text-3xl font-black tabular-nums ${
                        metrics.checkedGroceryCartTotal > metrics.remainingGroceryBudget
                          ? 'text-rose-300'
                          : 'text-slate-100'
                      }`}
                    >
                      {formatPeso(metrics.remainingGroceryBudget, privacyMode)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-teal-300" />
                    <select
                      value={checkoutWalletId}
                      onChange={(e) => setCheckoutWalletId(e.target.value as WalletId)}
                      className="min-h-[44px] rounded-xl bg-slate-900 border border-white/[0.16] px-3 py-2 text-xs sm:text-sm font-bold text-slate-100 focus:outline-none focus:border-teal-400"
                    >
                      {db.wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({formatPeso(w.balance, privacyMode)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <GlassButton
                    variant="primary"
                    size="md"
                    className="min-h-[44px] px-5 text-sm font-extrabold"
                    disabled={checkedCount === 0}
                    onClick={() => onCheckoutGroceries(checkoutWalletId)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Checkout Cart
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: NEEDS VS. WANTS EXPENSE FEED
         ===================================================================== */}
      {activeSubTab === 'breakdown' && (
        <div className="space-y-6">
          <div>
            <GlassSectionHeader
              title="Category Totals"
              icon={<Utensils className="w-5 h-5" />}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryTotals.map((cat) => (
                <GlassCard
                  key={cat.category}
                  glowColor={cat.pillar === 'need' ? 'emerald' : 'amber'}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <GlassBadge tone={cat.pillar === 'need' ? 'emerald' : 'amber'}>
                        {cat.pillar === 'need' ? 'NEED' : 'WANT'}
                      </GlassBadge>
                      <span className="text-xs font-bold text-slate-400 tabular-nums">
                        {cat.count}x
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-100">{cat.category}</p>
                  </div>
                  <p className="text-xl font-black tabular-nums text-slate-100">
                    {formatPeso(cat.total, privacyMode)}
                  </p>
                </GlassCard>
              ))}
            </div>
          </div>

          <GlassCard className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-slate-100">Expense Feed</h3>

              <div className="flex items-center gap-2">
                {(['all', 'need', 'want'] as const).map((filterVal) => (
                  <button
                    key={filterVal}
                    type="button"
                    onClick={() => setExpenseFilterPillar(filterVal)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      expenseFilterPillar === filterVal
                        ? 'bg-teal-500/20 text-teal-200 border-teal-400/40'
                        : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {filterVal === 'all' ? 'All' : filterVal === 'need' ? 'Needs' : 'Wants'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {filteredExpenses.length === 0 ? (
                <p className="text-sm font-bold text-slate-400 py-6 text-center">No expenses logged</p>
              ) : (
                filteredExpenses.map((exp) => {
                  const walletObj = db.wallets.find((w) => w.id === exp.walletId);
                  return (
                    <div
                      key={exp.id}
                      className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.07] flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-slate-100">
                            {exp.title}
                          </span>
                          <GlassBadge tone={exp.pillar === 'need' ? 'emerald' : 'amber'}>
                            {exp.pillar === 'need' ? 'Need' : 'Want'}
                          </GlassBadge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {exp.date}
                          </span>
                          <span>• {walletObj?.name ?? exp.walletId.toUpperCase()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <p
                          className={`text-lg sm:text-xl font-black tabular-nums ${
                            exp.pillar === 'need' ? 'text-emerald-300' : 'text-amber-300'
                          }`}
                        >
                          -{formatPeso(exp.amount, privacyMode)}
                        </p>

                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp.id)}
                          aria-label={`Delete ${exp.title}`}
                          title={`Delete ${exp.title}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-400/25 transition-all active:scale-95 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 3: 4. BUDOL GUARD WISHLIST
         ===================================================================== */}
      {activeSubTab === 'wishlist' && (
        <div className="space-y-6">
          <GlassCard glowColor="amber" className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-amber-300" />
                <h2 className="text-lg sm:text-xl font-black text-slate-100">
                  Budol Guard Wishlist
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-300" />
                  <select
                    value={wishlistBuyWallet}
                    onChange={(e) => setWishlistBuyWallet(e.target.value as WalletId)}
                    className="min-h-[44px] rounded-xl bg-slate-900 border border-white/[0.15] px-3 py-1.5 text-xs font-bold text-slate-100"
                  >
                    {db.wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({formatPeso(w.balance, privacyMode)})
                      </option>
                    ))}
                  </select>
                </div>

                <GlassButton
                  variant="amber"
                  size="md"
                  className="min-h-[44px]"
                  onClick={() => setIsWishlistModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  + Wishlist
                </GlassButton>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {db.wishlist.length === 0 ? (
              <GlassCard className="p-8 text-center col-span-full">
                <p className="text-base font-bold text-emerald-300">Zero Budol Queued</p>
              </GlassCard>
            ) : (
              db.wishlist.map((item) => {
                const canAffordFromWants = item.price <= remainingWantsBudget;
                const canAffordFromSafeToSpend = item.price <= metrics.safeToSpend;
                const isAffordable = canAffordFromWants && canAffordFromSafeToSpend;

                return (
                  <GlassCard
                    key={item.id}
                    glowColor={isAffordable ? 'emerald' : 'rose'}
                    className="p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-slate-100">{item.name}</h3>
                          <div className="flex items-center gap-2">
                            <GlassBadge tone="indigo">
                              <Clock className="w-3 h-3" />
                              {item.coolingOffDays}d cool-off
                            </GlassBadge>
                          </div>
                        </div>

                        <p className="text-2xl sm:text-3xl font-black tabular-nums text-amber-300">
                          {formatPeso(item.price, privacyMode)}
                        </p>
                      </div>

                      {/* Big Clear Status Pill */}
                      <div>
                        {isAffordable ? (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
                            <Check className="w-4 h-4" />
                            SAFE TO BUY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-200 border border-rose-400/40">
                            <AlertTriangle className="w-4 h-4" />
                            OVER BUDGET
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                      <GlassButton
                        variant="danger"
                        size="md"
                        className="flex-1 min-h-[44px]"
                        onClick={() => onDeleteWishlistItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Skip
                      </GlassButton>

                      <GlassButton
                        variant={isAffordable ? 'primary' : 'secondary'}
                        size="md"
                        className="flex-1 min-h-[44px]"
                        onClick={() => onConvertWishlistToExpense(item.id, wishlistBuyWallet)}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Buy
                        <ArrowRight className="w-4 h-4" />
                      </GlassButton>
                    </div>
                  </GlassCard>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: LOG HOUSEHOLD EXPENSE (NEED OR WANT)
         ===================================================================== */}
      <GlassModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={expPillar === 'need' ? 'Add Need' : 'Add Want'}
      >
        <form onSubmit={handleSubmitExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/70 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setExpPillar('need');
                setExpCategory(NEED_CATEGORIES[0]);
              }}
              className={`min-h-[44px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                expPillar === 'need'
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Need
            </button>
            <button
              type="button"
              onClick={() => {
                setExpPillar('want');
                setExpCategory(WANT_CATEGORIES[0]);
              }}
              className={`min-h-[44px] py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                expPillar === 'want'
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Want
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Item Name</label>
            <input
              type="text"
              required
              placeholder={expPillar === 'need' ? 'e.g., Palengke Meat & Gulay' : 'e.g., Iced Coffee'}
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Amount (₱)</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                placeholder="0"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-100 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-400"
              >
                {(expPillar === 'need' ? NEED_CATEGORIES : WANT_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Wallet</label>
              <select
                value={expWalletId}
                onChange={(e) => setExpWalletId(e.target.value as WalletId)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-400"
              >
                {db.wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatPeso(w.balance, privacyMode)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Cutoff</label>
              <select
                value={expCutoff}
                onChange={(e) => setExpCutoff(e.target.value as '1st_kinsenas' | '2nd_kinsenas')}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-400"
              >
                <option value="1st_kinsenas">1st Kinsenas</option>
                <option value="2nd_kinsenas">2nd Kinsenas</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <GlassButton variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant={expPillar === 'need' ? 'primary' : 'amber'}>
              Save
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* =====================================================================
          MODAL 2: ADD CUSTOM GROCERY / PALENGKE ITEM
         ===================================================================== */}
      <GlassModal
        isOpen={isAddGroceryOpen}
        onClose={() => setIsAddGroceryOpen(false)}
        title="Add Grocery Item"
      >
        <form onSubmit={handleSubmitGroceryItem} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Dishwashing Liquid"
              value={gName}
              onChange={(e) => setGName(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
              <select
                value={gCategory}
                onChange={(e) => setGCategory(e.target.value as GroceryCategory)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100"
              >
                {GROCERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Quantity</label>
              <input
                type="text"
                required
                placeholder="1 pack"
                value={gQuantity}
                onChange={(e) => setGQuantity(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Price (₱)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="150"
                value={gEstPrice}
                onChange={(e) => setGEstPrice(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Type</label>
              <select
                value={gPillar}
                onChange={(e) => setGPillar(e.target.value as 'need' | 'want')}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100"
              >
                <option value="need">Need</option>
                <option value="want">Want</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Stock</label>
              <select
                value={gStock}
                onChange={(e) => setGStock(e.target.value as StockStatus)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100"
              >
                <option value="out_of_stock">Out</option>
                <option value="running_low">Low</option>
                <option value="in_stock">In Stock</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <GlassButton variant="ghost" onClick={() => setIsAddGroceryOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Add Item
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* =====================================================================
          MODAL 3: LOG SUPPLY REFILL (BIGAS / LPG / WATER)
         ===================================================================== */}
      <GlassModal
        isOpen={Boolean(refillTargetId)}
        onClose={() => setRefillTargetId(null)}
        title="Supply Refill"
      >
        <form onSubmit={handleConfirmRefill} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Refill Cost (₱)</label>
            <input
              type="number"
              required
              min="1"
              value={refillCost}
              onChange={(e) => setRefillCost(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Pay Wallet</label>
            <select
              value={refillWalletId}
              onChange={(e) => setRefillWalletId(e.target.value as WalletId)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100"
            >
              {db.wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({formatPeso(w.balance, privacyMode)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <GlassButton variant="ghost" onClick={() => setRefillTargetId(null)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Confirm Refill
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* =====================================================================
          MODAL 4: ADD BUDOL GUARD WISHLIST ITEM
         ===================================================================== */}
      <GlassModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        title="Add Wishlist Item"
      >
        <form onSubmit={handleSubmitWishlist} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Non-Stick Wok"
              value={wName}
              onChange={(e) => setWName(e.target.value)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Price (₱)</label>
              <input
                type="number"
                required
                min="1"
                placeholder="850"
                value={wPrice}
                onChange={(e) => setWPrice(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
              <select
                value={wCategory}
                onChange={(e) => setWCategory(e.target.value as WantCategory)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100"
              >
                {WANT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Cool-Off Days</label>
              <input
                type="number"
                min="1"
                max="60"
                value={wCoolingDays}
                onChange={(e) => setWCoolingDays(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Priority</label>
              <select
                value={wPriority}
                onChange={(e) => setWPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                className="w-full min-h-[44px] rounded-xl bg-slate-900/90 border border-white/[0.14] px-3.5 py-2.5 text-sm text-slate-100"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <GlassButton variant="ghost" onClick={() => setIsWishlistModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="amber">
              Add Item
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
