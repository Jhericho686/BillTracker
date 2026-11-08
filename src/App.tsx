import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home,
  Wallet as WalletIcon,
  ShoppingBag,
  Zap,
  Handshake,
  ShieldCheck,
  Eye,
  EyeOff,
  Plus,
  ArrowRightLeft,
  TrendingUp,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  RotateCcw,
  Download,
  Flame,
  Droplets,
  Utensils,
  Coffee,
  Sliders,
  Palette,
  Trash2,
  Menu,
  X,
  Smartphone,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

import {
  HouseholdDatabaseState,
  WalletId,
  IncomeEntry,
  ExpenseEntry,
  GroceryItem,
  StockStatus,
  WishlistItem,
  KuryenteBill,
  UtangRecord,
  AuditModule,
} from './types/database';
import {
  loadHouseholdDB,
  saveHouseholdDB,
  resetHouseholdDB,
  exportDatabaseJSON,
} from './db/householdDatabase';
import {
  AuthUser,
  fetchStateFromFirebase,
  getSavedSessionUser,
  logoutAccount,
} from './db/firebase';
import {
  calculateHouseholdDashboardMetrics,
  calculateSixMonthAnalytics,
} from './services/householdEngine';
import { createAuditLog } from './services/auditLogger';
import {
  GlassCard,
  GlassButton,
  GlassBadge,
  GlassProgressBar,
  GlassModal,
  GlassSectionHeader,
  formatPeso,
  AnimatedPeso,
  DashboardSkeleton,
} from './components/ui/GlassComponents';
import { NeedsGroceriesWantsView } from './components/NeedsGroceriesWantsView';
import { KuryenteAndHistoryView } from './components/KuryenteAndHistoryView';
import { UtangHubView } from './components/UtangHubView';
import { AuditLogsView } from './components/AuditLogsView';
import { AuthPage } from './components/AuthPage';

type ActiveTab = 'dashboard' | 'income' | 'groceries_needs' | 'kuryente_history' | 'utang' | 'audit';
type ColorTheme = 'aurora' | 'mocha' | 'cyber_sunset' | 'nordic_sky';

const COLOR_THEMES: { id: ColorTheme; label: string; dotClass: string }[] = [
  { id: 'aurora', label: 'Aurora Violet', dotClass: 'from-violet-400 via-fuchsia-400 to-rose-400' },
  { id: 'mocha', label: 'Warm Mocha', dotClass: 'from-amber-400 via-orange-400 to-yellow-300' },
  { id: 'cyber_sunset', label: 'Berry Sunset', dotClass: 'from-rose-400 via-pink-500 to-orange-400' },
  { id: 'nordic_sky', label: 'Nordic Sky', dotClass: 'from-indigo-400 via-sky-400 to-purple-400' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      const lowerPath = path.toLowerCase();
      // Block suspicious dotfile/admin/config path probing & force re-authentication
      const isSuspiciousProbe =
        lowerPath.includes('/.') ||
        lowerPath.endsWith('.env') ||
        lowerPath.endsWith('.php') ||
        lowerPath.endsWith('.json') ||
        lowerPath.endsWith('.sql') ||
        lowerPath.endsWith('.git') ||
        (path !== '/' && path !== '/index.html');

      if (isSuspiciousProbe) {
        window.history.replaceState({}, '', '/');
        logoutAccount();
        return null;
      }
    }
    return getSavedSessionUser();
  });
  const [db, setDb] = useState<HouseholdDatabaseState>(() => loadHouseholdDB());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(true);
  const [isSkeletonFading, setIsSkeletonFading] = useState(false);
  const mainStageRef = useRef<HTMLElement | null>(null);
  const tabBlurNodeRef = useRef<SVGFEGaussianBlurElement | null>(null);

  // Bang-Motion §2: True SVG directional motion blur (`feGaussianBlur stdDeviation="x y"`)
  // during tab switches; detaches (`filter: none`) cleanly at rest.
  useEffect(() => {
    const stageEl = mainStageRef.current;
    const blurEl = tabBlurNodeRef.current;
    if (!stageEl || !blurEl) return;

    const duration = 350;
    const start = performance.now();
    stageEl.style.filter = 'url(#bm-tab-whip-blur)';
    let rafId = 0;

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // Power3-out decay from 26px horizontal blur -> 0px
      const easeOut = 1 - Math.pow(1 - p, 3);
      const vx = (1 - easeOut) * 26;
      const vy = vx * 0.08;
      blurEl.setAttribute('stdDeviation', `${vx.toFixed(2)} ${vy.toFixed(2)}`);
      stageEl.style.transform = `translate3d(${((1 - easeOut) * 14).toFixed(2)}px, 0, 0)`;

      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        blurEl.setAttribute('stdDeviation', '0 0');
        stageEl.style.filter = 'none';
        stageEl.style.transform = 'none';
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      if (stageEl) {
        stageEl.style.filter = 'none';
        stageEl.style.transform = 'none';
      }
    };
  }, [activeTab]);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('bahay_glass_theme') as ColorTheme | null;
    return saved && ['aurora', 'mocha', 'cyber_sunset', 'nordic_sky'].includes(saved)
      ? saved
      : 'nordic_sky';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bahay_glass_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        showToast('BillsTracker installed!');
        setDeferredInstallPrompt(null);
      }
    } else {
      showToast('Use browser menu → "Add to Home Screen" or "Install App"');
    }
  };

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<WalletId>('bank');
  const [transferTo, setTransferTo] = useState<WalletId>('cash');
  const [transferAmount, setTransferAmount] = useState<string>('2000');
  const [transferFee, setTransferFee] = useState<string>('0');

  const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = useState(false);
  const [newIncomeTitle, setNewIncomeTitle] = useState('');
  const [newIncomeType, setNewIncomeType] = useState<'allowance' | 'salary' | 'side_hustle'>('side_hustle');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeWallet, setNewIncomeWallet] = useState<WalletId>('gcash');
  const [newIncomeStatus, setNewIncomeStatus] = useState<'received' | 'pending'>('received');
  const [newIncomeCutoff, setNewIncomeCutoff] = useState<'1st_kinsenas' | '2nd_kinsenas' | 'monthly'>('1st_kinsenas');
  const [newIncomeContributor, setNewIncomeContributor] = useState(
    currentUser?.name || 'Household Head'
  );

  // Budget Calibration Modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editAllowanceBudget, setEditAllowanceBudget] = useState<string>(String(db.monthlyAllowanceBudget));
  const [editGroceriesBudget, setEditGroceriesBudget] = useState<string>(String(db.groceriesBudget));
  const [editKuryenteBudget, setEditKuryenteBudget] = useState<string>(String(db.kuryenteBudget));
  const [editWantsBudget, setEditWantsBudget] = useState<string>(String(db.wantsBudget));

  useEffect(() => {
    saveHouseholdDB(db);
  }, [db]);

  useEffect(() => {
    if (!currentUser) {
      setIsSkeletonVisible(false);
      setIsSkeletonFading(false);
      return;
    }
    setNewIncomeContributor(currentUser.name);
    let isMounted = true;
    setIsSkeletonVisible(true);
    setIsSkeletonFading(false);

    const startTime = Date.now();
    const minSkeletonDuration = 1000; // Hold skeleton for exactly 1 second

    let fadeTimer: NodeJS.Timeout | null = null;
    let removeTimer: NodeJS.Timeout | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const startTransition = () => {
      if (!isMounted) return;
      setIsSkeletonFading(true);
      removeTimer = setTimeout(() => {
        if (isMounted) {
          setIsSkeletonVisible(false);
        }
      }, 450);
    };

    fetchStateFromFirebase(currentUser.uid)
      .then((remote) => {
        if (isMounted && remote && Array.isArray(remote.wallets) && remote.wallets.length > 0) {
          setDb((prev) => ({
            ...prev,
            ...remote,
            wallets: Array.isArray(remote.wallets) ? remote.wallets : prev.wallets,
            incomes: Array.isArray(remote.incomes) ? remote.incomes : prev.incomes,
            expenses: Array.isArray(remote.expenses) ? remote.expenses : prev.expenses,
            groceries: Array.isArray(remote.groceries) ? remote.groceries : prev.groceries,
            supplies: Array.isArray(remote.supplies) ? remote.supplies : prev.supplies,
            wishlist: Array.isArray(remote.wishlist) ? remote.wishlist : prev.wishlist,
            kuryenteBills: Array.isArray(remote.kuryenteBills) ? remote.kuryenteBills : prev.kuryenteBills,
            utilityBills: Array.isArray(remote.utilityBills) ? remote.utilityBills : prev.utilityBills,
            appliances: Array.isArray(remote.appliances) ? remote.appliances : prev.appliances,
            utangs: Array.isArray(remote.utangs) ? remote.utangs : prev.utangs,
            sixMonthHistory: Array.isArray(remote.sixMonthHistory)
              ? remote.sixMonthHistory
              : prev.sixMonthHistory,
            auditLogs: Array.isArray(remote.auditLogs) ? remote.auditLogs : prev.auditLogs,
          }));
        }
      })
      .catch(() => {})
      .finally(() => {
        const elapsed = Date.now() - startTime;
        const waitTime = Math.max(0, minSkeletonDuration - elapsed);
        fadeTimer = setTimeout(() => {
          startTransition();
        }, waitTime);
      });

    // Hard fallback: guaranteed to begin smooth crossfade after 1050ms
    fallbackTimer = setTimeout(() => {
      startTransition();
    }, 1050);

    return () => {
      isMounted = false;
      if (fadeTimer) clearTimeout(fadeTimer);
      if (removeTimer) clearTimeout(removeTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const metrics = useMemo(() => calculateHouseholdDashboardMetrics(db), [db]);
  const sixMonthStats = useMemo(() => calculateSixMonthAnalytics(db.sixMonthHistory), [db.sixMonthHistory]);

  const commitWithAudit = (
    updater: (prev: HouseholdDatabaseState) => HouseholdDatabaseState,
    auditParams: Parameters<typeof createAuditLog>[0]
  ) => {
    const newAudit = createAuditLog({
      ...auditParams,
      actor: currentUser?.name || auditParams.actor,
    });
    setDb((prev) => {
      const updated = updater(prev);
      return {
        ...updated,
        auditLogs: [newAudit, ...updated.auditLogs],
      };
    });
  };

  const handleTogglePrivacy = () => {
    setDb((prev) => ({ ...prev, privacyMode: !prev.privacyMode }));
  };

  const handleCutoffChange = (cutoff: '1st_kinsenas' | '2nd_kinsenas' | 'full_month') => {
    setDb((prev) => ({ ...prev, activeCutoff: cutoff }));
  };

  const handleQuickPresetExpense = (
    title: string,
    amount: number,
    pillar: 'need' | 'want',
    category: string,
    walletId: WalletId
  ) => {
    const wallet = db.wallets.find((w) => w.id === walletId);
    const prevBal = wallet ? wallet.balance : 0;
    const newBal = prevBal - amount;

    const newExp: ExpenseEntry = {
      id: `EXP-${Date.now()}`,
      title,
      amount,
      pillar,
      category,
      date: new Date().toISOString().split('T')[0],
      cutoff: db.activeCutoff === '2nd_kinsenas' ? '2nd_kinsenas' : '1st_kinsenas',
      walletId,
      notes: '1-Tap Quick Log',
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => (w.id === walletId ? { ...w, balance: w.balance - amount } : w)),
        expenses: [newExp, ...prev.expenses],
      }),
      {
        action: 'CREATE',
        module: 'EXPENSE',
        summary: `Quick logged ${pillar.toUpperCase()}: "${title}"`,
        actor: 'Quick-Log',
        amountDelta: -amount,
        walletAffected: wallet?.name || walletId,
        previousValue: `₱${prevBal.toLocaleString()}`,
        newValue: `₱${newBal.toLocaleString()}`,
      }
    );

    showToast(`-₱${amount.toLocaleString()} • ${title}`);
  };

  const handleWalletTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(transferAmount) || 0;
    const fee = Number(transferFee) || 0;
    if (amt <= 0 || transferFrom === transferTo) return;

    const sourceWallet = db.wallets.find((w) => w.id === transferFrom);
    const destWallet = db.wallets.find((w) => w.id === transferTo);
    if (!sourceWallet || !destWallet) return;

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => {
          if (w.id === transferFrom) return { ...w, balance: w.balance - amt - fee };
          if (w.id === transferTo) return { ...w, balance: w.balance + amt };
          return w;
        }),
      }),
      {
        action: 'WALLET_TRANSFER',
        module: 'WALLET',
        summary: `Transferred ₱${amt.toLocaleString()} (${sourceWallet.name} → ${destWallet.name})`,
        actor: 'Household Treasury',
        amountDelta: -fee,
        walletAffected: `${sourceWallet.name} → ${destWallet.name}`,
        previousValue: `₱${sourceWallet.balance.toLocaleString()}`,
        newValue: `₱${(sourceWallet.balance - amt - fee).toLocaleString()}`,
      }
    );

    setIsTransferModalOpen(false);
    showToast(`Transferred ₱${amt.toLocaleString()} → ${destWallet.name}`);
  };

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(newIncomeAmount) || 0;
    if (!newIncomeTitle.trim() || amt <= 0) return;

    const wallet = db.wallets.find((w) => w.id === newIncomeWallet);
    const prevBal = wallet ? wallet.balance : 0;

    const entry: IncomeEntry = {
      id: `INC-${Date.now()}`,
      title: newIncomeTitle.trim(),
      type: newIncomeType,
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      cutoff: newIncomeCutoff,
      walletId: newIncomeWallet,
      status: newIncomeStatus,
      contributor: newIncomeContributor.trim() || 'Household',
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets:
          newIncomeStatus === 'received'
            ? prev.wallets.map((w) => (w.id === newIncomeWallet ? { ...w, balance: w.balance + amt } : w))
            : prev.wallets,
        incomes: [entry, ...prev.incomes],
      }),
      {
        action: 'CREATE',
        module: 'INCOME',
        summary: `Added ${newIncomeType.toUpperCase()}: "${entry.title}"`,
        actor: entry.contributor || 'Household',
        amountDelta: newIncomeStatus === 'received' ? amt : 0,
        walletAffected: wallet?.name || newIncomeWallet,
        previousValue: `₱${prevBal.toLocaleString()}`,
        newValue:
          newIncomeStatus === 'received'
            ? `₱${(prevBal + amt).toLocaleString()}`
            : `Pending (+₱${amt.toLocaleString()})`,
      }
    );

    setNewIncomeTitle('');
    setNewIncomeAmount('');
    setIsAddIncomeModalOpen(false);
    showToast(`+₱${amt.toLocaleString()} • ${entry.title}`);
  };

  const handleReceivePendingIncome = (incomeId: string) => {
    const inc = db.incomes.find((i) => i.id === incomeId);
    if (!inc || inc.status === 'received') return;
    const wallet = db.wallets.find((w) => w.id === inc.walletId);
    const prevBal = wallet ? wallet.balance : 0;

    commitWithAudit(
      (prev) => ({
        ...prev,
        incomes: prev.incomes.map((i) => (i.id === incomeId ? { ...i, status: 'received' } : i)),
        wallets: prev.wallets.map((w) =>
          w.id === inc.walletId ? { ...w, balance: w.balance + inc.amount } : w
        ),
      }),
      {
        action: 'PAYMENT',
        module: 'INCOME',
        summary: `Collected Side Hustle: "${inc.title}"`,
        actor: inc.contributor || 'Household',
        amountDelta: inc.amount,
        walletAffected: wallet?.name || inc.walletId,
        previousValue: `₱${prevBal.toLocaleString()}`,
        newValue: `₱${(prevBal + inc.amount).toLocaleString()}`,
      }
    );

    showToast(`Received +₱${inc.amount.toLocaleString()} → ${wallet?.name}`);
  };

  const handleToggleGroceryCheck = (id: string) => {
    setDb((prev) => ({
      ...prev,
      groceries: prev.groceries.map((g) => (g.id === id ? { ...g, isChecked: !g.isChecked } : g)),
    }));
  };

  const handleUpdateGroceryPrice = (id: string, actualPrice: number) => {
    setDb((prev) => ({
      ...prev,
      groceries: prev.groceries.map((g) => (g.id === id ? { ...g, actualPrice } : g)),
    }));
  };

  const handleUpdateGroceryStock = (id: string, stockStatus: StockStatus) => {
    const item = db.groceries.find((g) => g.id === id);
    if (!item) return;

    commitWithAudit(
      (prev) => ({
        ...prev,
        groceries: prev.groceries.map((g) =>
          g.id === id
            ? {
                ...g,
                stockStatus,
                isChecked: stockStatus === 'out_of_stock' || stockStatus === 'running_low' ? true : g.isChecked,
              }
            : g
        ),
      }),
      {
        action: 'UPDATE',
        module: 'GROCERY',
        summary: `Stock "${item.name}" → ${stockStatus}`,
        actor: 'Kusina',
        previousValue: item.stockStatus,
        newValue: stockStatus,
      }
    );
  };

  const handleAddGroceryItem = (item: Omit<GroceryItem, 'id' | 'isChecked'>) => {
    const newItem: GroceryItem = {
      ...item,
      id: `GROC-${Date.now()}`,
      isChecked: true,
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        groceries: [newItem, ...prev.groceries],
      }),
      {
        action: 'CREATE',
        module: 'GROCERY',
        summary: `Added "${newItem.name}" (${newItem.quantity})`,
        actor: 'Grocery List',
        amountDelta: newItem.estimatedPrice,
        newValue: `₱${newItem.estimatedPrice.toLocaleString()}`,
      }
    );
    showToast(`Added "${newItem.name}"`);
  };

  const handleCheckoutGroceries = (walletId: WalletId) => {
    const checkedItems = db.groceries.filter((g) => g.isChecked);
    if (checkedItems.length === 0) return;

    const needItems = checkedItems.filter((g) => g.pillar === 'need');
    const wantItems = checkedItems.filter((g) => g.pillar === 'want');

    const needTotal = needItems.reduce((sum, g) => sum + (g.actualPrice || g.estimatedPrice), 0);
    const wantTotal = wantItems.reduce((sum, g) => sum + (g.actualPrice || g.estimatedPrice), 0);
    const grandTotal = needTotal + wantTotal;

    const wallet = db.wallets.find((w) => w.id === walletId);
    const prevBal = wallet ? wallet.balance : 0;

    const today = new Date().toISOString().split('T')[0];
    const cutoff = db.activeCutoff === '2nd_kinsenas' ? '2nd_kinsenas' : '1st_kinsenas';

    const newExpenses: ExpenseEntry[] = [];
    if (needTotal > 0) {
      newExpenses.push({
        id: `EXP-GROC-N-${Date.now()}`,
        title: `Palengke & Grocery (${needItems.length} items)`,
        amount: needTotal,
        pillar: 'need',
        category: 'Palengke & Wet Market',
        date: today,
        cutoff,
        walletId,
        isFromGroceryChecklist: true,
        notes: needItems.map((i) => i.name).join(', '),
      });
    }
    if (wantTotal > 0) {
      newExpenses.push({
        id: `EXP-GROC-W-${Date.now() + 1}`,
        title: `Grocery Treats (${wantItems.length} items)`,
        amount: wantTotal,
        pillar: 'want',
        category: 'Home Upgrades & Treats',
        date: today,
        cutoff,
        walletId,
        isFromGroceryChecklist: true,
        notes: wantItems.map((i) => i.name).join(', '),
      });
    }

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => (w.id === walletId ? { ...w, balance: w.balance - grandTotal } : w)),
        expenses: [...newExpenses, ...prev.expenses],
        groceries: prev.groceries.map((g) =>
          g.isChecked
            ? {
                ...g,
                isChecked: false,
                stockStatus: 'in_stock',
                lastPricePaid: g.actualPrice || g.estimatedPrice,
              }
            : g
        ),
      }),
      {
        action: 'CHECKOUT',
        module: 'GROCERY',
        summary: `Checked out ${checkedItems.length} items (₱${grandTotal.toLocaleString()})`,
        actor: 'Grocery Checkout',
        amountDelta: -grandTotal,
        walletAffected: wallet?.name || walletId,
        previousValue: `₱${prevBal.toLocaleString()}`,
        newValue: `₱${(prevBal - grandTotal).toLocaleString()}`,
      }
    );

    showToast(`Checked out ${checkedItems.length} items • -₱${grandTotal.toLocaleString()}`);
  };

  const handleLoadGroceryTemplate = (
    templateName: 'palengke_weekly' | 'supermarket_pantry' | 'toiletries_restock'
  ) => {
    const templates: Record<typeof templateName, Omit<GroceryItem, 'id'>[]> = {
      palengke_weekly: [
        {
          name: 'Whole Chicken (Manok)',
          category: 'Palengke (Meat, Fish, Gulay)',
          quantity: '1.5 kg',
          estimatedPrice: 285,
          actualPrice: 285,
          lastPricePaid: 280,
          isChecked: true,
          pillar: 'need',
          stockStatus: 'out_of_stock',
        },
        {
          name: 'Bangus & Tilapia',
          category: 'Palengke (Meat, Fish, Gulay)',
          quantity: '1 kg',
          estimatedPrice: 220,
          actualPrice: 220,
          lastPricePaid: 210,
          isChecked: true,
          pillar: 'need',
          stockStatus: 'out_of_stock',
        },
        {
          name: 'Sari-Saring Gulay Pack',
          category: 'Palengke (Meat, Fish, Gulay)',
          quantity: '1 pack',
          estimatedPrice: 180,
          actualPrice: 180,
          lastPricePaid: 175,
          isChecked: true,
          pillar: 'need',
          stockStatus: 'running_low',
        },
      ],
      supermarket_pantry: [
        {
          name: 'Canned Tuna & Corned Beef',
          category: 'Supermarket & Pantry',
          quantity: '6 cans',
          estimatedPrice: 310,
          actualPrice: 310,
          lastPricePaid: 295,
          isChecked: true,
          pillar: 'need',
          stockStatus: 'running_low',
        },
        {
          name: 'Cooking Oil (1L)',
          category: 'Bigas & Kusina Staples',
          quantity: '1 L',
          estimatedPrice: 115,
          actualPrice: 115,
          lastPricePaid: 110,
          isChecked: true,
          pillar: 'need',
          stockStatus: 'running_low',
        },
      ],
      toiletries_restock: [
        {
          name: 'Laundry Detergent (2kg)',
          category: 'Toiletries & Laundry',
          quantity: '2 kg',
          estimatedPrice: 245,
          actualPrice: 245,
          lastPricePaid: 240,
          isChecked: true,
          pillar: 'need',
          stockStatus: 'running_low',
        },
        {
          name: 'Soap & Toothpaste Pack',
          category: 'Toiletries & Laundry',
          quantity: '1 pack',
          estimatedPrice: 195,
          actualPrice: 195,
          lastPricePaid: 190,
          isChecked: true,
          pillar: 'need',
          stockStatus: 'out_of_stock',
        },
      ],
    };

    const itemsToAdd = templates[templateName].map((t, idx) => ({
      ...t,
      id: `GROC-TPL-${Date.now()}-${idx}`,
    }));

    commitWithAudit(
      (prev) => ({
        ...prev,
        groceries: [...itemsToAdd, ...prev.groceries],
      }),
      {
        action: 'CREATE',
        module: 'GROCERY',
        summary: `Loaded template: ${templateName.replace('_', ' ')}`,
        actor: 'Grocery List',
      }
    );

    showToast(`Loaded +${itemsToAdd.length} items`);
  };

  const handleRefillSupply = (supplyId: string, walletId: WalletId, cost: number) => {
    const supply = db.supplies.find((s) => s.id === supplyId);
    const wallet = db.wallets.find((w) => w.id === walletId);
    if (!supply || !wallet) return;

    const today = new Date().toISOString().split('T')[0];
    const newExp: ExpenseEntry = {
      id: `EXP-SUP-${Date.now()}`,
      title: `Refill: ${supply.item}`,
      amount: cost,
      pillar: 'need',
      category: supply.item.includes('LPG')
        ? 'LPG & Cooking Gas'
        : supply.item.includes('Bigas')
        ? 'Bigas & Staples'
        : 'Tubig & Water Refills',
      date: today,
      cutoff: db.activeCutoff === '2nd_kinsenas' ? '2nd_kinsenas' : '1st_kinsenas',
      walletId,
      notes: '100% Refilled',
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => (w.id === walletId ? { ...w, balance: w.balance - cost } : w)),
        expenses: [newExp, ...prev.expenses],
        supplies: prev.supplies.map((s) =>
          s.id === supplyId ? { ...s, lastRefillDate: today, cost, remainingPercent: 100 } : s
        ),
      }),
      {
        action: 'CREATE',
        module: 'EXPENSE',
        summary: `Refilled "${supply.item}" to 100%`,
        actor: 'Kusina Tracker',
        amountDelta: -cost,
        walletAffected: wallet.name,
        previousValue: `${supply.remainingPercent}%`,
        newValue: `100% (₱${cost.toLocaleString()})`,
      }
    );

    showToast(`${supply.item} → 100% Full!`);
  };

  const handleAddExpense = (expense: Omit<ExpenseEntry, 'id'>) => {
    const wallet = db.wallets.find((w) => w.id === expense.walletId);
    const prevBal = wallet ? wallet.balance : 0;
    const newEntry: ExpenseEntry = {
      ...expense,
      id: `EXP-${Date.now()}`,
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) =>
          w.id === expense.walletId ? { ...w, balance: w.balance - expense.amount } : w
        ),
        expenses: [newEntry, ...prev.expenses],
      }),
      {
        action: 'CREATE',
        module: 'EXPENSE',
        summary: `Logged ${expense.pillar.toUpperCase()}: "${expense.title}"`,
        actor: 'Household',
        amountDelta: -expense.amount,
        walletAffected: wallet?.name || expense.walletId,
        previousValue: `₱${prevBal.toLocaleString()}`,
        newValue: `₱${(prevBal - expense.amount).toLocaleString()}`,
      }
    );

    showToast(`-₱${expense.amount.toLocaleString()} • ${expense.title}`);
  };

  const handleAddWishlistItem = (item: Omit<WishlistItem, 'id' | 'addedDate'>) => {
    const newItem: WishlistItem = {
      ...item,
      id: `WISH-${Date.now()}`,
      addedDate: new Date().toISOString().split('T')[0],
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        wishlist: [newItem, ...prev.wishlist],
      }),
      {
        action: 'CREATE',
        module: 'BUDGET',
        summary: `Wishlist: "${newItem.name}"`,
        actor: 'Budol Guard',
        amountDelta: newItem.price,
        newValue: `₱${newItem.price.toLocaleString()}`,
      }
    );

    showToast(`Added "${newItem.name}" to Wishlist`);
  };

  const handleConvertWishlistToExpense = (wishlistId: string, walletId: WalletId) => {
    const item = db.wishlist.find((w) => w.id === wishlistId);
    const wallet = db.wallets.find((w) => w.id === walletId);
    if (!item || !wallet) return;

    const newExp: ExpenseEntry = {
      id: `EXP-WISH-${Date.now()}`,
      title: item.name,
      amount: item.price,
      pillar: 'want',
      category: item.category,
      date: new Date().toISOString().split('T')[0],
      cutoff: db.activeCutoff === '2nd_kinsenas' ? '2nd_kinsenas' : '1st_kinsenas',
      walletId,
      notes: 'Wishlist Purchase',
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => (w.id === walletId ? { ...w, balance: w.balance - item.price } : w)),
        expenses: [newExp, ...prev.expenses],
        wishlist: prev.wishlist.filter((w) => w.id !== wishlistId),
      }),
      {
        action: 'CHECKOUT',
        module: 'EXPENSE',
        summary: `Bought Wishlist Want: "${item.name}"`,
        actor: 'Household',
        amountDelta: -item.price,
        walletAffected: wallet.name,
        previousValue: `₱${wallet.balance.toLocaleString()}`,
        newValue: `₱${(wallet.balance - item.price).toLocaleString()}`,
      }
    );

    showToast(`Bought "${item.name}" • -₱${item.price.toLocaleString()}`);
  };

  const handleDeleteWishlistItem = (wishlistId: string) => {
    const item = db.wishlist.find((w) => w.id === wishlistId);
    if (!item) return;

    commitWithAudit(
      (prev) => ({
        ...prev,
        wishlist: prev.wishlist.filter((w) => w.id !== wishlistId),
      }),
      {
        action: 'DELETE',
        module: 'BUDGET',
        summary: `Skipped "${item.name}" — Saved ₱${item.price.toLocaleString()}`,
        actor: 'Budol Guard',
        amountDelta: item.price,
      }
    );

    showToast(`Saved ₱${item.price.toLocaleString()}!`);
  };

  const handlePayUtilityBill = (billId: string, walletId: WalletId) => {
    const bill = db.utilityBills.find((b) => b.id === billId);
    const wallet = db.wallets.find((w) => w.id === walletId);
    if (!bill || !wallet || bill.status === 'paid') return;

    const today = new Date().toISOString().split('T')[0];
    const newExp: ExpenseEntry = {
      id: `EXP-BILL-${Date.now()}`,
      title: `${bill.type} (${bill.provider})`,
      amount: bill.amount,
      pillar: 'need',
      category:
        bill.type === 'Kuryente'
          ? 'Kuryente (Electricity)'
          : bill.type === 'Tubig'
          ? 'Tubig & Water Refills'
          : bill.type === 'Internet / Wi-Fi'
          ? 'Internet & Load'
          : bill.type === 'LPG / Gasul'
          ? 'LPG & Cooking Gas'
          : 'Rent & Housing',
      date: today,
      cutoff: bill.cutoff,
      walletId,
      notes: `Paid utility bill`,
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) => (w.id === walletId ? { ...w, balance: w.balance - bill.amount } : w)),
        utilityBills: prev.utilityBills.map((b) =>
          b.id === billId ? { ...b, status: 'paid', lastPaidDate: today } : b
        ),
        expenses: [newExp, ...prev.expenses],
      }),
      {
        action: 'BILL_PAID',
        module: 'KURYENTE',
        summary: `Paid ${bill.type} (${bill.provider})`,
        actor: 'Treasury',
        amountDelta: -bill.amount,
        walletAffected: wallet.name,
        previousValue: `Unpaid`,
        newValue: `Paid (₱${bill.amount.toLocaleString()})`,
      }
    );

    showToast(`Paid ${bill.type} • -₱${bill.amount.toLocaleString()}`);
  };

  const handleSaveKuryenteReading = (billData: Omit<KuryenteBill, 'id'>) => {
    const newBill: KuryenteBill = {
      ...billData,
      id: `KUR-${Date.now()}`,
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        kuryenteBills: [newBill, ...prev.kuryenteBills],
        utilityBills: prev.utilityBills.map((u) =>
          u.type === 'Kuryente' ? { ...u, amount: newBill.totalAmount, dueDate: newBill.dueDate } : u
        ),
      }),
      {
        action: 'CREATE',
        module: 'KURYENTE',
        summary: `Kuryente ${newBill.month}: ${newBill.kwhUsed} kWh`,
        actor: 'Meter Reader',
        amountDelta: -newBill.totalAmount,
        previousValue: `${newBill.prevReading} kWh`,
        newValue: `${newBill.currReading} kWh (₱${newBill.totalAmount.toLocaleString()})`,
      }
    );

    showToast(`Saved ${newBill.kwhUsed} kWh • ₱${newBill.totalAmount.toLocaleString()}`);
  };

  const handleUpdateKuryenteBudget = (newBudget: number) => {
    const oldBudget = db.kuryenteBudget;
    commitWithAudit(
      (prev) => ({
        ...prev,
        kuryenteBudget: newBudget,
      }),
      {
        action: 'UPDATE',
        module: 'KURYENTE',
        summary: `Updated Kuryente budget cap`,
        actor: 'Household',
        previousValue: `₱${oldBudget.toLocaleString()}`,
        newValue: `₱${newBudget.toLocaleString()}`,
      }
    );
    showToast(`Kuryente Cap: ₱${newBudget.toLocaleString()}`);
  };

  const handleUpdateApplianceHours = (applianceId: string, hoursPerDay: number) => {
    setDb((prev) => ({
      ...prev,
      appliances: prev.appliances.map((a) => (a.id === applianceId ? { ...a, hoursPerDay } : a)),
    }));
  };

  const handleLogUtangPayment = (utangId: string, amount: number, walletId: WalletId, note?: string) => {
    const utang = db.utangs.find((u) => u.id === utangId);
    const wallet = db.wallets.find((w) => w.id === walletId);
    if (!utang || !wallet || amount <= 0) return;

    const today = new Date().toISOString().split('T')[0];
    const isUtangKo = utang.direction === 'utang_ko';
    const newPaidAmount = Math.min(utang.totalAmount, utang.paidAmount + amount);
    const isNowPaid = newPaidAmount >= utang.totalAmount;
    const newPaidMonths = isNowPaid
      ? utang.totalMonths
      : Math.min(utang.totalMonths, utang.paidMonths + 1);

    const paymentLog = {
      id: `UPAY-${Date.now()}`,
      date: today,
      amount,
      walletId,
      note: note || (isUtangKo ? 'Hulog' : 'Collected'),
    };

    const newExp: ExpenseEntry | null = isUtangKo
      ? {
          id: `EXP-UTG-${Date.now()}`,
          title: `Utang: ${utang.personOrLender}`,
          amount,
          pillar: 'utang_payment',
          category: utang.category,
          date: today,
          cutoff: db.activeCutoff === '2nd_kinsenas' ? '2nd_kinsenas' : '1st_kinsenas',
          walletId,
          notes: note,
        }
      : null;

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) =>
          w.id === walletId
            ? { ...w, balance: isUtangKo ? w.balance - amount : w.balance + amount }
            : w
        ),
        expenses: newExp ? [newExp, ...prev.expenses] : prev.expenses,
        utangs: prev.utangs.map((u) =>
          u.id === utangId
            ? {
                ...u,
                paidAmount: newPaidAmount,
                paidMonths: newPaidMonths,
                status: isNowPaid ? 'paid' : u.status,
                paymentHistory: [paymentLog, ...u.paymentHistory],
              }
            : u
        ),
      }),
      {
        action: 'PAYMENT',
        module: 'UTANG',
        summary: isUtangKo
          ? `Paid ₱${amount.toLocaleString()} → ${utang.personOrLender}`
          : `Collected ₱${amount.toLocaleString()} ← ${utang.personOrLender}`,
        actor: 'Utang Ledger',
        amountDelta: isUtangKo ? -amount : amount,
        walletAffected: wallet.name,
        previousValue: `₱${utang.paidAmount.toLocaleString()}`,
        newValue: `₱${newPaidAmount.toLocaleString()}`,
      }
    );

    showToast(
      isUtangKo
        ? `Paid ₱${amount.toLocaleString()} → ${utang.personOrLender}`
        : `Collected +₱${amount.toLocaleString()} ← ${utang.personOrLender}`
    );
  };

  const handleAddUtang = (newUtangData: Omit<UtangRecord, 'id' | 'paymentHistory' | 'status'>) => {
    const newRecord: UtangRecord = {
      ...newUtangData,
      id: `UTG-${Date.now()}`,
      status: newUtangData.paidAmount >= newUtangData.totalAmount ? 'paid' : 'active',
      paymentHistory: [],
    };

    commitWithAudit(
      (prev) => ({
        ...prev,
        utangs: [newRecord, ...prev.utangs],
      }),
      {
        action: 'CREATE',
        module: 'UTANG',
        summary: `Added Utang: "${newRecord.personOrLender}"`,
        actor: 'Utang Ledger',
        amountDelta: newRecord.direction === 'utang_ko' ? -newRecord.totalAmount : newRecord.totalAmount,
        newValue: `₱${newRecord.totalAmount.toLocaleString()}`,
      }
    );

    showToast(`Added "${newRecord.personOrLender}"`);
  };

  // =========================================================================
  // DELETE HANDLERS (WITH AUTOMATIC WALLET REVERSAL & AUDIT LOGGING)
  // =========================================================================
  const handleDeleteIncome = (incomeId: string) => {
    const inc = db.incomes.find((i) => i.id === incomeId);
    if (!inc) return;
    const wallet = db.wallets.find((w) => w.id === inc.walletId);
    const wasReceived = inc.status === 'received';

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: wasReceived
          ? prev.wallets.map((w) =>
              w.id === inc.walletId ? { ...w, balance: w.balance - inc.amount } : w
            )
          : prev.wallets,
        incomes: prev.incomes.filter((i) => i.id !== incomeId),
      }),
      {
        action: 'DELETE',
        module: 'INCOME',
        summary: `Deleted income: "${inc.title}"`,
        actor: 'Household Admin',
        amountDelta: wasReceived ? -inc.amount : 0,
        walletAffected: wallet?.name || inc.walletId,
        previousValue: `₱${inc.amount.toLocaleString()}`,
        newValue: 'Deleted',
      }
    );

    showToast(`Deleted "${inc.title}"`);
  };

  const handleDeleteGroceryItem = (groceryId: string) => {
    const item = db.groceries.find((g) => g.id === groceryId);
    if (!item) return;

    commitWithAudit(
      (prev) => ({
        ...prev,
        groceries: prev.groceries.filter((g) => g.id !== groceryId),
      }),
      {
        action: 'DELETE',
        module: 'GROCERY',
        summary: `Deleted grocery item: "${item.name}"`,
        actor: 'Household Admin',
        previousValue: `${item.quantity} (₱${item.estimatedPrice.toLocaleString()})`,
        newValue: 'Deleted',
      }
    );

    showToast(`Deleted "${item.name}"`);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const exp = db.expenses.find((e) => e.id === expenseId);
    if (!exp) return;
    const wallet = db.wallets.find((w) => w.id === exp.walletId);

    commitWithAudit(
      (prev) => ({
        ...prev,
        wallets: prev.wallets.map((w) =>
          w.id === exp.walletId ? { ...w, balance: w.balance + exp.amount } : w
        ),
        expenses: prev.expenses.filter((e) => e.id !== expenseId),
      }),
      {
        action: 'DELETE',
        module: 'EXPENSE',
        summary: `Deleted expense & refunded wallet: "${exp.title}"`,
        actor: 'Household Admin',
        amountDelta: exp.amount,
        walletAffected: wallet?.name || exp.walletId,
        previousValue: `-₱${exp.amount.toLocaleString()}`,
        newValue: `Refunded +₱${exp.amount.toLocaleString()}`,
      }
    );

    showToast(`Deleted "${exp.title}" • Refunded +₱${exp.amount.toLocaleString()}`);
  };

  const handleDeleteUtilityBill = (billId: string) => {
    const bill = db.utilityBills.find((b) => b.id === billId);
    if (!bill) return;

    commitWithAudit(
      (prev) => ({
        ...prev,
        utilityBills: prev.utilityBills.filter((b) => b.id !== billId),
      }),
      {
        action: 'DELETE',
        module: 'KURYENTE',
        summary: `Deleted house utility bill: "${bill.type} (${bill.provider})"`,
        actor: 'Household Admin',
        previousValue: `₱${bill.amount.toLocaleString()}`,
        newValue: 'Deleted',
      }
    );

    showToast(`Deleted ${bill.type} bill`);
  };

  const handleDeleteKuryenteReading = (kuryenteId: string) => {
    const reading = db.kuryenteBills.find((k) => k.id === kuryenteId);
    if (!reading) return;

    commitWithAudit(
      (prev) => ({
        ...prev,
        kuryenteBills: prev.kuryenteBills.filter((k) => k.id !== kuryenteId),
      }),
      {
        action: 'DELETE',
        module: 'KURYENTE',
        summary: `Deleted Kuryente reading: "${reading.month}" (${reading.kwhUsed} kWh)`,
        actor: 'Household Admin',
        previousValue: `₱${reading.totalAmount.toLocaleString()}`,
        newValue: 'Deleted',
      }
    );

    showToast(`Deleted ${reading.month} reading`);
  };

  const handleDeleteUtang = (utangId: string) => {
    const utang = db.utangs.find((u) => u.id === utangId);
    if (!utang) return;

    commitWithAudit(
      (prev) => ({
        ...prev,
        utangs: prev.utangs.filter((u) => u.id !== utangId),
      }),
      {
        action: 'DELETE',
        module: 'UTANG',
        summary: `Deleted Utang record: "${utang.personOrLender}" (${utang.purpose})`,
        actor: 'Utang Ledger',
        previousValue: `₱${utang.totalAmount.toLocaleString()}`,
        newValue: 'Deleted',
      }
    );

    showToast(`Deleted "${utang.personOrLender}"`);
  };

  const handleLogManualAuditNote = (summary: string, module: AuditModule) => {
    commitWithAudit(
      (prev) => prev,
      {
        action: 'UPDATE',
        module,
        summary,
        actor: 'Household Admin',
      }
    );
    showToast('Audit note saved');
  };

  const handleDeleteAuditLog = (logId: string) => {
    setDb((prev) => ({
      ...prev,
      auditLogs: prev.auditLogs.filter((l) => l.id !== logId),
    }));
    showToast('Deleted audit log entry');
  };

  const handleClearAuditLogs = () => {
    setDb((prev) => ({
      ...prev,
      auditLogs: [],
    }));
    showToast('Cleared audit logs');
  };

  const handleSaveBudgetCalibration = (e: React.FormEvent) => {
    e.preventDefault();
    const allowance = Number(editAllowanceBudget) || db.monthlyAllowanceBudget;
    const groceries = Number(editGroceriesBudget) || db.groceriesBudget;
    const kuryente = Number(editKuryenteBudget) || db.kuryenteBudget;
    const wants = Number(editWantsBudget) || db.wantsBudget;

    commitWithAudit(
      (prev) => ({
        ...prev,
        monthlyAllowanceBudget: allowance,
        groceriesBudget: groceries,
        kuryenteBudget: kuryente,
        wantsBudget: wants,
      }),
      {
        action: 'UPDATE',
        module: 'BUDGET',
        summary: `Updated Budget Caps`,
        actor: 'Household',
        previousValue: `Groceries: ₱${db.groceriesBudget.toLocaleString()}`,
        newValue: `Groceries: ₱${groceries.toLocaleString()}`,
      }
    );

    setIsBudgetModalOpen(false);
    showToast('Budget targets updated!');
  };

  const handleApplySixMonthAverageToBudget = () => {
    const safeGroceries = Math.round(sixMonthStats.avgGroceriesNeeds / 50) * 50;
    const safeKuryente = Math.round(sixMonthStats.avgKuryentePeso / 50) * 50;
    const safeWants = Math.round(sixMonthStats.avgTotalWants / 50) * 50;
    const safeAllowance = Math.round(sixMonthStats.householdSurvivalBaseline / 100) * 100;

    setEditAllowanceBudget(String(safeAllowance));
    setEditGroceriesBudget(String(safeGroceries));
    setEditKuryenteBudget(String(safeKuryente));
    setEditWantsBudget(String(safeWants));

    commitWithAudit(
      (prev) => ({
        ...prev,
        monthlyAllowanceBudget: safeAllowance,
        groceriesBudget: safeGroceries,
        kuryenteBudget: safeKuryente,
        wantsBudget: safeWants,
      }),
      {
        action: 'UPDATE',
        module: 'BUDGET',
        summary: `Applied 6-Month Safe Averages`,
        actor: 'Analytics Engine',
        previousValue: `₱${db.groceriesBudget.toLocaleString()}`,
        newValue: `₱${safeGroceries.toLocaleString()}`,
      }
    );

    setIsBudgetModalOpen(false);
    showToast('6-Mo Safe Averages Applied!');
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDatabaseJSON(db);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bahay-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    commitWithAudit(
      (prev) => prev,
      {
        action: 'SYSTEM_BACKUP',
        module: 'SYSTEM',
        summary: 'Exported JSON backup',
        actor: currentUser?.name || 'Household Admin',
      }
    );
    showToast('Backup downloaded');
  };

  const handleLogout = async () => {
    await logoutAccount();
    setIsMenuOpen(false);
    setCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <AuthPage
        onAuthenticated={(user: AuthUser) => {
          setCurrentUser(user);
          showToast(`Welcome, ${user.name}!`);
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh pb-28 md:pb-12 text-slate-100 relative overflow-x-hidden">
      {/* Ambient Eye-Friendly Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="ambient-blob w-[440px] h-[440px] bg-indigo-500/15 -top-28 -left-24" />
        <div className="ambient-blob w-[500px] h-[500px] bg-sky-500/15 top-1/3 -right-32" />
        <div className="ambient-blob w-[380px] h-[380px] bg-teal-500/15 bottom-0 left-1/4" />
      </div>

      {/* Accessible Toast Region */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 glass-panel px-5 py-3.5 rounded-2xl border border-fuchsia-400/45 shadow-2xl flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-rose-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold text-white tabular-nums">{toastMessage}</span>
        </div>
      )}

      {/* Top Glass Header — Ultra Clean with Hamburger Menu */}
      <header className="sticky top-0 z-30 glass-panel border-b border-white/[0.08] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand & Active Section Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/[0.16] p-1.5 flex items-center justify-center shadow-lg">
              <img
                src="./logo.png"
                alt="BillsTracker Logo"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black tracking-tight text-white">
                Bills<span className="text-amber-400">Tracker</span>
              </h1>
              {/* Task 7: Grouped Status Chips (Collapsed gracefully on mobile) */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                <GlassBadge tone="teal">
                  {activeTab === 'dashboard'
                    ? 'Bahay'
                    : activeTab === 'income'
                    ? 'Pasok'
                    : activeTab === 'groceries_needs'
                    ? 'Grocery & Wants'
                    : activeTab === 'kuryente_history'
                    ? 'Kuryente & 6-Mo'
                    : activeTab === 'utang'
                    ? 'Utang Hub'
                    : 'Audit Logs'}
                </GlassBadge>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white/[0.04] border border-white/[0.06] text-slate-300">
                  {db.activeCutoff === '1st_kinsenas'
                    ? '1st (1–15)'
                    : db.activeCutoff === '2nd_kinsenas'
                    ? '2nd (16–30)'
                    : 'Full Month'}
                </span>
                <span className="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-white/[0.04] border border-white/[0.06] text-teal-200">
                  <UserIcon className="w-3 h-3 text-teal-300" aria-hidden="true" />
                  {currentUser.name}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Privacy Eye + Hamburger Menu Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePrivacy}
              aria-label={db.privacyMode ? 'Show Amounts' : 'Hide Amounts'}
              title={db.privacyMode ? 'Show Amounts' : 'Hide Amounts'}
              className="min-w-[44px] min-h-[44px] glass-pill rounded-xl flex items-center justify-center text-slate-200 hover:text-white hover:border-teal-400/40 transition active:scale-[0.97] cursor-pointer"
            >
              {db.privacyMode ? (
                <EyeOff className="w-4 h-4 text-amber-300" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Open Navigation & Settings Menu"
              aria-expanded={isMenuOpen}
              className="min-h-[44px] px-3.5 glass-pill rounded-xl flex items-center gap-2 text-sm font-bold text-white border border-teal-400/35 hover:border-teal-400/60 transition active:scale-[0.97] cursor-pointer"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-teal-300" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5 text-teal-300" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger Slide-Over Glass Drawer */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation and Settings Menu"
        >
          {/* Backdrop with fading blur */}
          <div
            className="fintech-drawer-backdrop fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Content with cubic-bezier slide-in */}
          <div className="fintech-drawer-panel relative z-10 w-full max-w-sm glass-panel border-l border-white/[0.14] h-full overflow-y-auto p-5 flex flex-col justify-between space-y-6 shadow-2xl">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.16] p-1 flex items-center justify-center">
                    <img
                      src="./logo.png"
                      alt="BillsTracker Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-lg font-black text-white">
                    Bills<span className="text-amber-400">Tracker</span> Menu
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close Menu"
                  className="w-11 h-11 rounded-xl glass-pill flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Logged-in User Profile Card */}
              <div className="p-3.5 rounded-2xl glass-card border border-teal-400/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/40 to-rose-500/40 border border-white/20 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-white truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] font-semibold text-teal-200 truncate">
                      {currentUser.householdName} • {currentUser.role}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="min-h-[38px] px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/35 text-xs font-bold text-rose-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Log Out</span>
                </button>
              </div>

              {/* 1. Navigation Sections */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">
                  SECTIONS
                </span>
                <div className="space-y-1.5">
                  {[
                    { id: 'dashboard', label: 'Bahay', icon: Home },
                    { id: 'income', label: 'Pasok (Income)', icon: TrendingUp },
                    { id: 'groceries_needs', label: 'Grocery & Wants', icon: ShoppingBag },
                    { id: 'kuryente_history', label: 'Kuryente & 6-Mo', icon: Zap },
                    { id: 'utang', label: 'Utang Hub', icon: Handshake },
                    { id: 'audit', label: `Audit Logs (${db.auditLogs.length})`, icon: ShieldCheck },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id as ActiveTab);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full min-h-[46px] flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-teal-500/15 text-white border border-teal-400/40 shadow-sm font-extrabold'
                            : 'glass-pill text-slate-300 hover:text-white hover:bg-white/[0.08]'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 ${isActive ? 'text-teal-300' : 'text-slate-400'}`}
                            aria-hidden="true"
                          />
                          {tab.label}
                        </span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-teal-300" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Period / Kinsenas Cutoff */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">
                  BUDGET PERIOD
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: '1st_kinsenas', label: '1st (1–15)' },
                    { key: '2nd_kinsenas', label: '2nd (16–30)' },
                    { key: 'full_month', label: 'Full Month' },
                  ].map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => handleCutoffChange(c.key as any)}
                      className={`min-h-[42px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        db.activeCutoff === c.key
                          ? 'bg-teal-500/30 text-teal-200 border border-teal-400/45 shadow'
                          : 'glass-pill text-slate-300 hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Quick Controls */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">
                  QUICK CONTROLS
                </span>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleInstallApp();
                    }}
                    className="w-full min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-teal-500/25 to-violet-500/25 border border-teal-400/45 flex items-center justify-between text-xs font-bold text-teal-200 hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Smartphone className="w-4 h-4 text-teal-300" aria-hidden="true" />
                      Install as App (Phone / PC)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setEditAllowanceBudget(String(db.monthlyAllowanceBudget));
                      setEditGroceriesBudget(String(db.groceriesBudget));
                      setEditKuryenteBudget(String(db.kuryenteBudget));
                      setEditWantsBudget(String(db.wantsBudget));
                      setIsBudgetModalOpen(true);
                    }}
                    className="w-full min-h-[44px] px-4 rounded-xl glass-pill flex items-center justify-between text-xs font-bold text-slate-200 hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-teal-300" aria-hidden="true" />
                      Edit Budget Targets
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear all data and reset to zero?')) {
                        setDb(resetHouseholdDB());
                        setIsMenuOpen(false);
                        showToast('All data cleared');
                      }
                    }}
                    className="w-full min-h-[44px] px-4 rounded-xl glass-pill flex items-center justify-between text-xs font-bold text-rose-300 hover:bg-rose-500/15 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <RotateCcw className="w-4 h-4 text-rose-300" aria-hidden="true" />
                      Clear All Data
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full min-h-[44px] px-4 rounded-xl glass-pill flex items-center justify-between text-xs font-bold text-amber-300 hover:bg-amber-500/15 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <LogOut className="w-4 h-4 text-amber-300" aria-hidden="true" />
                      Sign Out ({currentUser.email})
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bang-Motion §2: SVG Directional Motion Blur Filter Definition */}
      <svg className="fixed w-0 h-0 opacity-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="bm-tab-whip-blur" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur ref={tabBlurNodeRef} stdDeviation="0 0" />
          </filter>
        </defs>
      </svg>

      {/* Main Content Container */}
      <main ref={mainStageRef} className="max-w-7xl mx-auto px-4 py-6 relative z-10 space-y-6">
        {/* =====================================================================
            TAB 1: BAHAY COMMAND CENTER (BIG NUMBERS, MINIMAL WORDS)
           ===================================================================== */}
        {activeTab === 'dashboard' && (
          <div className="relative">
            {isSkeletonVisible && (
              <div
                className={`transition-all duration-500 ease-out ${
                  isSkeletonFading
                    ? 'opacity-0 scale-[0.99] pointer-events-none'
                    : 'opacity-100 scale-100'
                } ${!isSkeletonFading ? 'relative' : 'absolute inset-0 z-10'}`}
              >
                <DashboardSkeleton />
              </div>
            )}

            <div
              className={`space-y-6 transition-all duration-500 ease-out ${
                !isSkeletonFading && isSkeletonVisible
                  ? 'opacity-0 translate-y-3 pointer-events-none'
                  : 'opacity-100 translate-y-0'
              }`}
            >
            {/* Hero Row: Giant Safe-to-Spend with Animated Gradient Ring + 3 Pillar Meters */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 7 Cols: Giant Safe-to-Spend - Clear Star of the Dashboard */}
              <GlassCard
                glowColor="teal"
                className="fintech-stagger fintech-delay-1 lg:col-span-7 p-6 sm:p-7 flex flex-col justify-between hero-safe-card"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-teal-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-300" aria-hidden="true" />
                      SAFE TO SPEND
                    </span>
                    <GlassBadge tone="teal">{metrics.daysRemainingInPeriod}d Left</GlassBadge>
                  </div>

                  {/* Task 1: Giant Number + Thin Animated SVG Gradient Ring Arc */}
                  {(() => {
                    // Calculate % of monthly budget remaining
                    const totalBasis = Math.max(1, metrics.receivedIncomeThisMonth || db.monthlyAllowanceBudget || 1);
                    const safeRemainingPct = Math.min(100, Math.max(0, (metrics.safeToSpend / totalBasis) * 100));
                    // Circle circumference = 2 * pi * r = 2 * 3.14159 * 45 = 282.74
                    const ringCircumference = 283;
                    const strokeOffset = ringCircumference * (1 - safeRemainingPct / 100);

                    return (
                      <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                        {/* Huge Fintech Hero Amount */}
                        <div className="flex-1 min-w-0">
                          <div className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white tabular-nums leading-none drop-shadow-sm">
                            <AnimatedPeso amount={metrics.safeToSpend} privacyMode={db.privacyMode} />
                          </div>
                          
                          {/* Daily Burn Rate sub-pill */}
                          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-slate-200">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Daily Limit:
                            </span>
                            <span className="text-sm font-extrabold text-teal-300 tabular-nums">
                              <AnimatedPeso amount={metrics.dailySafeBurnRate} privacyMode={db.privacyMode} />
                            </span>
                            <span className="text-xs text-slate-400">/day</span>
                          </div>
                        </div>

                        {/* Thin Animated SVG Gradient Ring Gauge Filling the Card */}
                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                            <defs>
                              <linearGradient id="fintech-safe-arc" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#2dd4bf" />
                                <stop offset="60%" stopColor="#38bdf8" />
                                <stop offset="100%" stopColor="#c084fc" />
                              </linearGradient>
                            </defs>
                            {/* Background Track */}
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeWidth="5"
                            />
                            {/* Animated Progress Arc */}
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="url(#fintech-safe-arc)"
                              strokeWidth="5"
                              strokeLinecap="round"
                              className="fintech-ring-circle"
                              style={
                                {
                                  '--target-dashoffset': `${strokeOffset.toFixed(1)}`,
                                } as React.CSSProperties
                              }
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <span className="text-lg sm:text-xl font-black text-white tabular-nums tracking-tight">
                              {Math.round(safeRemainingPct)}%
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-teal-200/80">
                              Remaining
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 4 Big Scannable Protection Tiles (Lighter, subtle borders) */}
                <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="glass-pill p-3.5 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ALL WALLETS</p>
                    <p className="text-xl sm:text-2xl font-black text-teal-300 tabular-nums mt-1">
                      <AnimatedPeso amount={metrics.totalWalletBalance} privacyMode={db.privacyMode} />
                    </p>
                  </div>
                  <div className="glass-pill p-3.5 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">UNPAID BILLS</p>
                    <p className="text-xl sm:text-2xl font-black text-amber-300 tabular-nums mt-1">
                      <AnimatedPeso
                        amount={metrics.unpaidUtilityBillsTotal}
                        privacyMode={db.privacyMode}
                        prefix="-"
                      />
                    </p>
                  </div>
                  <div className="glass-pill p-3.5 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">UTANG DUE</p>
                    <p className="text-xl sm:text-2xl font-black text-rose-300 tabular-nums mt-1">
                      <AnimatedPeso
                        amount={metrics.dueUtangKoThisCutoff}
                        privacyMode={db.privacyMode}
                        prefix="-"
                      />
                    </p>
                  </div>
                  <div className="glass-pill p-3.5 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">GROCERY LEFT</p>
                    <p className="text-xl sm:text-2xl font-black text-white tabular-nums mt-1">
                      <AnimatedPeso
                        amount={metrics.remainingGroceryBudget}
                        privacyMode={db.privacyMode}
                      />
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Right 5 Cols: Monthly Split (Secondary card - lighter border, less fill) */}
              <GlassCard
                glowColor="none"
                className="fintech-stagger fintech-delay-2 lg:col-span-5 p-6 flex flex-col justify-between space-y-4 secondary-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    MONTHLY SPLIT
                  </span>
                  <GlassBadge tone="slate">
                    Baseline {formatPeso(sixMonthStats.householdSurvivalBaseline, db.privacyMode)}
                  </GlassBadge>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="glass-pill p-3 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300">NEEDS</span>
                    <p className="text-lg sm:text-xl font-black text-white tabular-nums mt-0.5">
                      <AnimatedPeso amount={metrics.expensesByPillar.needs} privacyMode={db.privacyMode} />
                    </p>
                  </div>
                  <div className="glass-pill p-3 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">WANTS</span>
                    <p className="text-lg sm:text-xl font-black text-white tabular-nums mt-0.5">
                      <AnimatedPeso amount={metrics.expensesByPillar.wants} privacyMode={db.privacyMode} />
                    </p>
                  </div>
                  <div className="glass-pill p-3 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">UTANG</span>
                    <p className="text-lg sm:text-xl font-black text-white tabular-nums mt-0.5">
                      <AnimatedPeso amount={metrics.expensesByPillar.utangPayments} privacyMode={db.privacyMode} />
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <GlassProgressBar
                    value={metrics.expensesByPillar.needs}
                    max={Math.max(1, metrics.receivedIncomeThisMonth)}
                    tone="emerald"
                    labelLeft="Needs Used"
                    labelRight={`${Math.round(
                      (metrics.expensesByPillar.needs / Math.max(1, metrics.receivedIncomeThisMonth)) * 100
                    )}%`}
                  />
                  <GlassProgressBar
                    value={metrics.expensesByPillar.wants}
                    max={db.wantsBudget}
                    tone="amber"
                    labelLeft="Wants Cap"
                    labelRight={`${formatPeso(db.wantsBudget, db.privacyMode)}`}
                  />
                </div>

                {/* Cash vs Digital Quick Split */}
                <div className="glass-pill p-3 rounded-2xl border border-teal-400/25 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                      CASH NEEDED (PALENGKE)
                    </span>
                    <span className="text-lg font-black text-white tabular-nums">
                      {formatPeso(
                        metrics.cashWithdrawalRecommendation.recommendedCashForPalengkeAndGroceries,
                        db.privacyMode
                      )}
                    </span>
                  </div>
                  <GlassButton variant="secondary" size="sm" onClick={() => setIsTransferModalOpen(true)}>
                    <ArrowRightLeft className="w-4 h-4 mr-1.5 inline" aria-hidden="true" />
                    Transfer
                  </GlassButton>
                </div>
              </GlassCard>
            </div>

            {/* 4 Big Wallet Cards (Secondary Cards: Lighter borders & less fill) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {db.wallets.map((w, wIdx) => (
                <GlassCard
                  key={w.id}
                  className={`fintech-stagger fintech-delay-${(wIdx % 4) + 3} p-5 flex flex-col justify-between secondary-card`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">{w.name}</span>
                    <GlassBadge
                      tone={
                        w.id === 'cash'
                          ? 'emerald'
                          : w.id === 'gcash'
                          ? 'indigo'
                          : w.id === 'maya'
                          ? 'teal'
                          : 'amber'
                      }
                    >
                      {w.type}
                    </GlassBadge>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-white tabular-nums my-3">
                    <AnimatedPeso amount={w.balance} privacyMode={db.privacyMode} />
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {w.accountNumber || 'Cash Envelope'}
                  </p>
                </GlassCard>
              ))}
            </div>

            {/* Bottom 3-Column Scannable Snapshot: Kusina Stock + Bills Due + Utang (With Task 6: Empty States) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Col 1: Kusina Supplies */}
              <GlassCard className="fintech-stagger fintech-delay-5 p-5 space-y-4 secondary-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-teal-300">
                    KUSINA STOCK
                  </span>
                  <button
                    onClick={() => setActiveTab('groceries_needs')}
                    className="min-h-[38px] px-2 text-xs font-bold text-teal-300 hover:underline cursor-pointer"
                  >
                    Checklist →
                  </button>
                </div>
                {db.supplies.length === 0 ? (
                  <div className="py-8 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2.5">
                    <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto opacity-70" aria-hidden="true" />
                    <p className="text-xs font-bold text-slate-300">Walang naka-listang stock sa kusina ngayon.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('groceries_needs')}
                      className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-200 border border-teal-400/35 text-xs font-extrabold hover:bg-teal-500/30 transition cursor-pointer"
                    >
                      + Mag-list ng Grocery
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {db.supplies.map((s) => (
                      <div key={s.id} className="glass-pill p-3.5 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-sm font-bold text-white">{s.item}</span>
                          <span className="text-xl font-black tabular-nums text-teal-300">
                            {s.remainingPercent}%
                          </span>
                        </div>
                        <GlassProgressBar
                          value={s.remainingPercent}
                          max={100}
                          tone={s.remainingPercent <= 25 ? 'rose' : s.remainingPercent <= 50 ? 'amber' : 'emerald'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Col 2: House Bills */}
              <GlassCard className="fintech-stagger fintech-delay-6 p-5 space-y-4 secondary-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                    HOUSE BILLS
                  </span>
                  <button
                    onClick={() => setActiveTab('kuryente_history')}
                    className="min-h-[38px] px-2 text-xs font-bold text-teal-300 hover:underline cursor-pointer"
                  >
                    All Bills →
                  </button>
                </div>
                {db.utilityBills.length === 0 ? (
                  <div className="py-8 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2.5">
                    <Zap className="w-8 h-8 text-amber-300/80 mx-auto opacity-70" aria-hidden="true" />
                    <p className="text-xs font-bold text-slate-300">Walang bayaring bills nakapila ngayong cutoff.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('kuryente_history')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/35 text-xs font-extrabold hover:bg-amber-500/30 transition cursor-pointer"
                    >
                      + Mag-log ng Bill
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {db.utilityBills.slice(0, 4).map((bill) => (
                      <div
                        key={bill.id}
                        className="glass-pill p-3.5 rounded-2xl bg-white/[0.03] border-white/[0.08] flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-sm font-bold text-white">{bill.type}</p>
                          <p className="text-xs text-slate-400">Due {bill.dueDate}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-white tabular-nums">
                            <AnimatedPeso amount={bill.amount} privacyMode={db.privacyMode} />
                          </p>
                          <GlassBadge tone={bill.status === 'paid' ? 'emerald' : 'amber'}>
                            {bill.status.toUpperCase()}
                          </GlassBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Col 3: Utang Summary */}
              <GlassCard className="fintech-stagger fintech-delay-7 p-5 space-y-4 secondary-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-rose-300">
                    UTANG TRACKER
                  </span>
                  <button
                    onClick={() => setActiveTab('utang')}
                    className="min-h-[38px] px-2 text-xs font-bold text-teal-300 hover:underline cursor-pointer"
                  >
                    Utang Hub →
                  </button>
                </div>
                {db.utangs.length === 0 ? (
                  <div className="py-8 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-2.5">
                    <Handshake className="w-8 h-8 text-rose-300/80 mx-auto opacity-70" aria-hidden="true" />
                    <p className="text-xs font-bold text-slate-300">Walang nakatalang utang o pautang.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('utang')}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-400/35 text-xs font-extrabold hover:bg-rose-500/30 transition cursor-pointer"
                    >
                      + Mag-tala sa Utang Hub
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-pill p-3.5 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                        <p className="text-[11px] font-bold uppercase text-slate-400">WE OWE</p>
                        <p className="text-2xl font-black text-rose-300 tabular-nums mt-1">
                          <AnimatedPeso amount={metrics.totalUtangKoBalance} privacyMode={db.privacyMode} />
                        </p>
                      </div>
                      <div className="glass-pill p-3.5 rounded-2xl bg-white/[0.03] border-white/[0.08]">
                        <p className="text-[11px] font-bold uppercase text-slate-400">OWED TO US</p>
                        <p className="text-2xl font-black text-teal-300 tabular-nums mt-1">
                          <AnimatedPeso amount={metrics.totalUtangNilaBalance} privacyMode={db.privacyMode} />
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {db.utangs
                        .filter((u) => u.status !== 'paid')
                        .slice(0, 2)
                        .map((u) => (
                          <div key={u.id} className="glass-pill p-3 rounded-2xl bg-white/[0.03] border-white/[0.08] flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-white">{u.personOrLender}</p>
                              <p className="text-xs text-slate-400">
                                {u.paidMonths}/{u.totalMonths} mos
                              </p>
                            </div>
                            <p className="text-lg font-black text-white tabular-nums">
                              <AnimatedPeso amount={u.totalAmount - u.paidAmount} privacyMode={db.privacyMode} />
                            </p>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </GlassCard>
            </div>
          </div>
        </div>
      )}

        {/* =====================================================================
            TAB 2: PASOK NG PERA (ALLOWANCE, SALARY & SIDE HUSTLES)
           ===================================================================== */}
        {activeTab === 'income' && (
          <div className="space-y-6 bm-stage">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">Pasok ng Pera</h2>
                <p className="text-xs text-slate-400">Allowance • Salary (15/30) • Side Hustles</p>
              </div>
              <GlassButton variant="primary" size="md" onClick={() => setIsAddIncomeModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5 inline" aria-hidden="true" />
                Add Income
              </GlassButton>
            </div>

            {/* 3 Giant Income Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Monthly Allowance */}
              <GlassCard glowColor="teal" className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-teal-300">
                    MONTHLY ALLOWANCE
                  </span>
                  <Calendar className="w-5 h-5 text-teal-300" aria-hidden="true" />
                </div>
                <p className="text-4xl sm:text-5xl font-black text-white tabular-nums">
                  {formatPeso(metrics.incomeByType.allowance, db.privacyMode)}
                </p>
                <GlassProgressBar
                  value={metrics.expensesByPillar.needs}
                  max={Math.max(1, db.monthlyAllowanceBudget)}
                  tone="teal"
                  labelLeft="Target"
                  labelRight={formatPeso(db.monthlyAllowanceBudget, db.privacyMode)}
                />
              </GlassCard>

              {/* Regular Salary */}
              <GlassCard glowColor="emerald" className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                    SALARY (15TH / 30TH)
                  </span>
                  <Briefcase className="w-5 h-5 text-emerald-300" aria-hidden="true" />
                </div>
                <p className="text-4xl sm:text-5xl font-black text-white tabular-nums">
                  {formatPeso(metrics.incomeByType.salary, db.privacyMode)}
                </p>
                <div className="glass-pill p-3 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">6-Mo Avg Income</span>
                  <strong className="text-base font-black text-emerald-300 tabular-nums">
                    {formatPeso(sixMonthStats.avgTotalIncome, db.privacyMode)}
                  </strong>
                </div>
              </GlassCard>

              {/* Side Hustles */}
              <GlassCard glowColor="amber" className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                    SIDE HUSTLES / RAKET
                  </span>
                  <Sparkles className="w-5 h-5 text-amber-300" aria-hidden="true" />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-4xl sm:text-5xl font-black text-white tabular-nums">
                    {formatPeso(metrics.incomeByType.sideHustle, db.privacyMode)}
                  </p>
                  {metrics.pendingSideHustleIncome > 0 && (
                    <GlassBadge tone="amber">
                      +{formatPeso(metrics.pendingSideHustleIncome, db.privacyMode)} Pending
                    </GlassBadge>
                  )}
                </div>
                <div className="glass-pill p-3 rounded-xl flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-semibold">Best Month ({sixMonthStats.bestSideHustleMonth?.monthLabel})</span>
                  <strong className="text-base font-black text-amber-300 tabular-nums">
                    {formatPeso(sixMonthStats.bestSideHustleMonth?.sideHustleIncome || 0, db.privacyMode)}
                  </strong>
                </div>
              </GlassCard>
            </div>

            {/* Clean Income List */}
            <GlassCard className="p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-4">
                INCOME LOGS
              </h3>
              <div className="space-y-2.5">
                {db.incomes.map((inc) => {
                  const wallet = db.wallets.find((w) => w.id === inc.walletId);
                  return (
                    <div
                      key={inc.id}
                      className="glass-pill p-4 rounded-2xl flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-white">{inc.title}</span>
                          <GlassBadge
                            tone={
                              inc.type === 'salary'
                                ? 'emerald'
                                : inc.type === 'allowance'
                                ? 'teal'
                                : 'amber'
                            }
                          >
                            {inc.type.replace('_', ' ').toUpperCase()}
                          </GlassBadge>
                          {inc.status === 'pending' && (
                            <GlassBadge tone="amber">
                              <Clock className="w-3.5 h-3.5 mr-1 inline" aria-hidden="true" />
                              PENDING
                            </GlassBadge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {inc.date} • {wallet?.name}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-emerald-300 tabular-nums">
                          +{formatPeso(inc.amount, db.privacyMode)}
                        </span>
                        {inc.status === 'pending' && (
                          <GlassButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleReceivePendingIncome(inc.id)}
                          >
                            Receive Now
                          </GlassButton>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteIncome(inc.id)}
                          aria-label={`Delete ${inc.title}`}
                          title="Delete Income"
                          className="min-w-[44px] min-h-[44px] rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-400/25 text-rose-300 flex items-center justify-center transition active:scale-[0.96] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        )}

        {/* =====================================================================
            TAB 3: PALENGKE, GROCERIES & NEEDS VS. WANTS
           ===================================================================== */}
        {activeTab === 'groceries_needs' && (
          <div className="bm-stage">
            <NeedsGroceriesWantsView
              db={db}
              privacyMode={db.privacyMode}
              onToggleGroceryCheck={handleToggleGroceryCheck}
              onUpdateGroceryPrice={handleUpdateGroceryPrice}
              onUpdateGroceryStock={handleUpdateGroceryStock}
              onAddGroceryItem={handleAddGroceryItem}
              onCheckoutGroceries={handleCheckoutGroceries}
              onLoadGroceryTemplate={handleLoadGroceryTemplate}
              onRefillSupply={handleRefillSupply}
              onAddExpense={handleAddExpense}
              onAddWishlistItem={handleAddWishlistItem}
              onConvertWishlistToExpense={handleConvertWishlistToExpense}
              onDeleteWishlistItem={handleDeleteWishlistItem}
              onDeleteGroceryItem={handleDeleteGroceryItem}
              onDeleteExpense={handleDeleteExpense}
            />
          </div>
        )}

        {/* =====================================================================
            TAB 4: KURYENTE, HOUSE BILLS & 6-MONTH HISTORY
           ===================================================================== */}
        {activeTab === 'kuryente_history' && (
          <div className="bm-stage">
            <KuryenteAndHistoryView
              db={db}
              privacyMode={db.privacyMode}
              onPayUtilityBill={handlePayUtilityBill}
              onSaveKuryenteReading={handleSaveKuryenteReading}
              onUpdateKuryenteBudget={handleUpdateKuryenteBudget}
              onUpdateApplianceHours={handleUpdateApplianceHours}
              onDeleteUtilityBill={handleDeleteUtilityBill}
              onDeleteKuryenteReading={handleDeleteKuryenteReading}
            />
          </div>
        )}

        {/* =====================================================================
            TAB 5: UTANG NG BAHAY & UTANG NILA
           ===================================================================== */}
        {activeTab === 'utang' && (
          <div className="bm-stage">
            <UtangHubView
              db={db}
              privacyMode={db.privacyMode}
              onLogUtangPayment={handleLogUtangPayment}
              onAddUtang={handleAddUtang}
              onDeleteUtang={handleDeleteUtang}
            />
          </div>
        )}

        {/* =====================================================================
            TAB 6: AUDIT LOGS & FINANCIAL INTEGRITY
           ===================================================================== */}
        {activeTab === 'audit' && (
          <div className="bm-stage">
            <AuditLogsView
              logs={db.auditLogs}
              privacyMode={db.privacyMode}
              onLogManualAuditNote={handleLogManualAuditNote}
              onDeleteAuditLog={handleDeleteAuditLog}
              onClearTestLogs={handleClearAuditLogs}
            />
          </div>
        )}
      </main>

      {/* Mobile Bottom Glass Navigation Bar — Strictly 5 Top-Level Items (UI/UX Pro Max Rule `bottom-nav-limit`) */}
      <nav
        aria-label="Primary Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-panel border-t border-white/[0.10] px-2 py-1.5 grid grid-cols-5 gap-1"
      >
        {[
          { id: 'dashboard', label: 'Bahay', icon: Home },
          { id: 'income', label: 'Pasok', icon: TrendingUp },
          { id: 'groceries_needs', label: 'Grocery', icon: ShoppingBag },
          { id: 'kuryente_history', label: 'Kuryente', icon: Zap },
          { id: 'utang', label: 'Utang', icon: Handshake },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold transition active:scale-[0.96] cursor-pointer ${
                isActive ? 'text-teal-300 bg-white/[0.10]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modal: Wallet Transfer */}
      <GlassModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Wallet Transfer"
        subtitle="Move funds between Cash, GCash, Maya & Bank"
      >
        <form onSubmit={handleWalletTransfer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="transfer-from" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                From
              </label>
              <select
                id="transfer-from"
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value as WalletId)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-sm font-semibold"
              >
                {db.wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900">
                    {w.name} (₱{w.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="transfer-to" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                To
              </label>
              <select
                id="transfer-to"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value as WalletId)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-sm font-semibold"
              >
                {db.wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900">
                    {w.name} (₱{w.balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="transfer-amt" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Amount (₱) *
              </label>
              <input
                id="transfer-amt"
                type="number"
                required
                min="1"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-lg font-black tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="transfer-fee" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Fee (₱)
              </label>
              <input
                id="transfer-fee"
                type="number"
                min="0"
                value={transferFee}
                onChange={(e) => setTransferFee(e.target.value)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-lg font-black tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Transfer Now
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Modal: Log New Income */}
      <GlassModal
        isOpen={isAddIncomeModalOpen}
        onClose={() => setIsAddIncomeModalOpen(false)}
        title="Add Income"
        subtitle="Allowance • Salary • Side Hustle"
      >
        <form onSubmit={handleAddIncome} className="space-y-4">
          <div>
            <label htmlFor="inc-title" className="block text-xs font-bold uppercase text-slate-300 mb-1">
              Source Title *
            </label>
            <input
              id="inc-title"
              type="text"
              required
              placeholder="e.g., 15th Salary, Monthly Allowance, Raket"
              value={newIncomeTitle}
              onChange={(e) => setNewIncomeTitle(e.target.value)}
              className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="inc-type" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Type
              </label>
              <select
                id="inc-type"
                value={newIncomeType}
                onChange={(e) => setNewIncomeType(e.target.value as any)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-sm font-semibold"
              >
                <option value="allowance" className="bg-slate-900">
                  Allowance
                </option>
                <option value="salary" className="bg-slate-900">
                  Salary (15/30)
                </option>
                <option value="side_hustle" className="bg-slate-900">
                  Side Hustle / Raket
                </option>
              </select>
            </div>
            <div>
              <label htmlFor="inc-amt" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Amount (₱) *
              </label>
              <input
                id="inc-amt"
                type="number"
                required
                min="1"
                placeholder="12500"
                value={newIncomeAmount}
                onChange={(e) => setNewIncomeAmount(e.target.value)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-lg font-black tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="inc-wallet" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Wallet
              </label>
              <select
                id="inc-wallet"
                value={newIncomeWallet}
                onChange={(e) => setNewIncomeWallet(e.target.value as WalletId)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-sm font-semibold"
              >
                {db.wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900">
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="inc-cutoff" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Cutoff
              </label>
              <select
                id="inc-cutoff"
                value={newIncomeCutoff}
                onChange={(e) => setNewIncomeCutoff(e.target.value as any)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-sm font-semibold"
              >
                <option value="1st_kinsenas" className="bg-slate-900">
                  1st (1–15)
                </option>
                <option value="2nd_kinsenas" className="bg-slate-900">
                  2nd (16–30)
                </option>
                <option value="monthly" className="bg-slate-900">
                  Monthly
                </option>
              </select>
            </div>
            <div>
              <label htmlFor="inc-status" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Status
              </label>
              <select
                id="inc-status"
                value={newIncomeStatus}
                onChange={(e) => setNewIncomeStatus(e.target.value as any)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-sm font-semibold"
              >
                <option value="received" className="bg-slate-900">
                  Received
                </option>
                <option value="pending" className="bg-slate-900">
                  Pending
                </option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" onClick={() => setIsAddIncomeModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Save Income
            </GlassButton>
          </div>
        </form>
      </GlassModal>

      {/* Modal: Budget Calibration */}
      <GlassModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Monthly Budget Caps"
        subtitle="Set targets or apply 6-Month Safe Averages"
      >
        <form onSubmit={handleSaveBudgetCalibration} className="space-y-4">
          <div className="glass-pill p-4 rounded-2xl border border-teal-400/25 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300 block">
                6-MONTH SAFE BASELINE
              </span>
              <span className="text-2xl font-black text-white tabular-nums">
                ₱{sixMonthStats.householdSurvivalBaseline.toLocaleString()}/mo
              </span>
            </div>
            <GlassButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleApplySixMonthAverageToBudget}
            >
              Auto-Apply 6-Mo Avg
            </GlassButton>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="b-allowance" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Monthly Allowance (₱)
              </label>
              <input
                id="b-allowance"
                type="number"
                required
                min="500"
                value={editAllowanceBudget}
                onChange={(e) => setEditAllowanceBudget(e.target.value)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-lg font-black tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="b-grocery" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Groceries Cap (₱)
              </label>
              <input
                id="b-grocery"
                type="number"
                required
                min="500"
                value={editGroceriesBudget}
                onChange={(e) => setEditGroceriesBudget(e.target.value)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-lg font-black tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="b-kuryente" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Kuryente Cap (₱)
              </label>
              <input
                id="b-kuryente"
                type="number"
                required
                min="300"
                value={editKuryenteBudget}
                onChange={(e) => setEditKuryenteBudget(e.target.value)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-lg font-black tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="b-wants" className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Wants Cap (₱)
              </label>
              <input
                id="b-wants"
                type="number"
                required
                min="0"
                value={editWantsBudget}
                onChange={(e) => setEditWantsBudget(e.target.value)}
                className="w-full min-h-[44px] glass-input px-3 py-2 rounded-xl text-lg font-black tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" onClick={() => setIsBudgetModalOpen(false)}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="primary">
              Save Caps
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
