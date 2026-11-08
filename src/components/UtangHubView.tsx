import React, { useState, useMemo } from 'react';
import {
  Handshake,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Calendar,
  CreditCard,
  Users,
  Plus,
  Copy,
  Check,
  History,
  ChevronDown,
  ChevronUp,
  Wallet as WalletIcon,
  MessageSquareShare,
  Trash2,
} from 'lucide-react';
import {
  HouseholdDatabaseState,
  UtangCategory,
  UtangDirection,
  UtangRecord,
  WalletId,
} from '../types/database';
import {
  calculateHouseholdDashboardMetrics,
  generateSingilStatementText,
} from '../services/householdEngine';
import {
  GlassCard,
  GlassButton,
  GlassBadge,
  GlassProgressBar,
  GlassSectionHeader,
  GlassModal,
  formatPeso,
} from './ui/GlassComponents';

export interface UtangHubViewProps {
  db: HouseholdDatabaseState;
  privacyMode: boolean;
  onLogUtangPayment: (
    utangId: string,
    amount: number,
    walletId: WalletId,
    note?: string
  ) => void;
  onAddUtang: (
    newUtang: Omit<UtangRecord, 'id' | 'paymentHistory' | 'status'>
  ) => void;
  onDeleteUtang: (utangId: string) => void;
}

const UTANG_CATEGORIES: UtangCategory[] = [
  'Home Credit / Appliance',
  'SPayLater / LazPayLater',
  'Credit Card',
  'Billease / GLoan / Maya Credit',
  'Relatives / Friends',
  'Sari-Sari Store Lista',
  'Household Abono',
];

export const UtangHubView: React.FC<UtangHubViewProps> = ({
  db,
  privacyMode,
  onLogUtangPayment,
  onAddUtang,
  onDeleteUtang,
}) => {
  const metrics = useMemo(() => calculateHouseholdDashboardMetrics(db), [db]);

  // Sub-Tab Switcher: 'utang_ko' vs 'utang_nila'
  const [activeSubTab, setActiveSubTab] = useState<UtangDirection>('utang_ko');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Payment History Drawer toggle per utang card
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<
    Record<string, boolean>
  >({});
  const [recentlyPaidUtangId, setRecentlyPaidUtangId] = useState<string | null>(null);

  // Log Bayad / Collection Modal state
  const [paymentModalUtang, setPaymentModalUtang] =
    useState<UtangRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentWalletId, setPaymentWalletId] = useState<WalletId>('gcash');
  const [paymentNote, setPaymentNote] = useState<string>('');

  // Generate Singil Reminder Modal state
  const [singilModalUtang, setSingilModalUtang] = useState<UtangRecord | null>(
    null
  );
  const [gcashReceivingInfo, setGcashReceivingInfo] = useState<string>(
    '0917-555-0198 (GCash / Maya - Household Vault)'
  );
  const [copiedStatement, setCopiedStatement] = useState<boolean>(false);

  // Add New Utang Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newDirection, setNewDirection] = useState<UtangDirection>('utang_ko');
  const [newPersonOrLender, setNewPersonOrLender] = useState<string>('');
  const [newCategory, setNewCategory] = useState<UtangCategory>(
    'SPayLater / LazPayLater'
  );
  const [newPurpose, setNewPurpose] = useState<string>('');
  const [newPurposePillar, setNewPurposePillar] = useState<'need' | 'want'>(
    'need'
  );
  const [newTotalAmount, setNewTotalAmount] = useState<string>('');
  const [newMonthlyInstallment, setNewMonthlyInstallment] =
    useState<string>('');
  const [newTotalMonths, setNewTotalMonths] = useState<string>('6');
  const [newDueDate, setNewDueDate] = useState<string>('Every 15th');
  const [newCutoff, setNewCutoff] = useState<'1st_kinsenas' | '2nd_kinsenas'>(
    '1st_kinsenas'
  );
  const [newContactInfo, setNewContactInfo] = useState<string>('');

  const utangKoList = useMemo(
    () =>
      db.utangs.filter(
        (u) =>
          u.direction === 'utang_ko' &&
          (selectedCategory === 'ALL' || u.category === selectedCategory)
      ),
    [db.utangs, selectedCategory]
  );

  const utangNilaList = useMemo(
    () =>
      db.utangs.filter(
        (u) =>
          u.direction === 'utang_nila' &&
          (selectedCategory === 'ALL' || u.category === selectedCategory)
      ),
    [db.utangs, selectedCategory]
  );

  const toggleHistoryDrawer = (id: string) => {
    setExpandedHistoryIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openPaymentModal = (utang: UtangRecord, isFull = false) => {
    const remaining = Math.max(0, utang.totalAmount - utang.paidAmount);
    const defaultAmt = isFull
      ? remaining
      : Math.min(utang.monthlyInstallment || remaining, remaining);
    setPaymentModalUtang(utang);
    setPaymentAmount(String(defaultAmt));
    setPaymentWalletId(
      utang.category === 'Sari-Sari Store Lista' ? 'cash' : 'gcash'
    );
    setPaymentNote(
      utang.direction === 'utang_ko'
        ? `Hulog: ${utang.purpose}`
        : `Collection: ${utang.personOrLender}`
    );
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalUtang) return;
    const amt = Number(paymentAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;

    const targetId = paymentModalUtang.id;
    onLogUtangPayment(
      targetId,
      amt,
      paymentWalletId,
      paymentNote.trim() || undefined
    );
    setRecentlyPaidUtangId(targetId);
    setTimeout(() => setRecentlyPaidUtangId((prev) => (prev === targetId ? null : prev)), 800);
    setPaymentModalUtang(null);
  };

  const handleCopySingilText = () => {
    if (!singilModalUtang) return;
    const text = generateSingilStatementText(
      singilModalUtang,
      gcashReceivingInfo
    );
    navigator.clipboard?.writeText(text);
    setCopiedStatement(true);
    setTimeout(() => setCopiedStatement(false), 3000);
  };

  const handleAddUtangSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmt = Number(newTotalAmount) || 0;
    const months = Math.max(1, Number(newTotalMonths) || 1);
    const installment =
      Number(newMonthlyInstallment) || Math.round(totalAmt / months);

    if (!newPersonOrLender.trim() || totalAmt <= 0) return;

    onAddUtang({
      direction: newDirection,
      personOrLender: newPersonOrLender.trim(),
      category: newCategory,
      purpose: newPurpose.trim() || newCategory,
      purposePillar: newPurposePillar,
      totalAmount: totalAmt,
      paidAmount: 0,
      monthlyInstallment: installment,
      totalMonths: months,
      paidMonths: 0,
      dueDate: newDueDate.trim() || 'Every 15th',
      cutoff: newCutoff,
      contactInfo: newContactInfo.trim() || undefined,
    });

    setNewPersonOrLender('');
    setNewPurpose('');
    setNewTotalAmount('');
    setNewMonthlyInstallment('');
    setIsAddModalOpen(false);
  };

  const debtBadgeTone =
    metrics.utangDebtStatus === 'Safe'
      ? 'emerald'
      : metrics.utangDebtStatus === 'Moderate'
      ? 'amber'
      : 'rose';

  return (
    <div className="space-y-8 pb-10">
      {/* ===================================================================
          TOP 4 BIG-NUMBER TILES
         =================================================================== */}
      <section className="space-y-4">
        <GlassSectionHeader
          title="Utang & Hulugan Hub"
          icon={<Handshake className="w-5 h-5" />}
          action={
            <GlassButton
              variant="primary"
              size="md"
              className="min-h-[44px]"
              onClick={() => {
                setNewDirection(activeSubTab);
                setIsAddModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Utang
            </GlassButton>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Utang Ko (We Owe) */}
          <GlassCard glowColor="rose" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Utang Ko (We Owe)
              </span>
              <div className="p-2 rounded-xl bg-rose-500/15 text-rose-300">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-rose-200">
              {formatPeso(metrics.totalUtangKoBalance, privacyMode)}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Monthly Hulog</span>
              <span className="font-bold text-slate-200 tabular-nums">
                {formatPeso(metrics.monthlyUtangInstallmentsTotal, privacyMode)}/mo
              </span>
            </div>
          </GlassCard>

          {/* Tile 2: Utang Nila (Collectible) */}
          <GlassCard glowColor="teal" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Utang Nila (Collectible)
              </span>
              <div className="p-2 rounded-xl bg-teal-500/15 text-teal-300">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-teal-200">
              {formatPeso(metrics.totalUtangNilaBalance, privacyMode)}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Receivables</span>
              <span className="font-bold text-teal-300">
                {db.utangs.filter((u) => u.direction === 'utang_nila').length} Active
              </span>
            </div>
          </GlassCard>

          {/* Tile 3: Due This Cutoff */}
          <GlassCard glowColor="amber" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Due This Cutoff
              </span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-amber-300">
              {formatPeso(metrics.dueUtangKoThisCutoff, privacyMode)}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Active Cutoff</span>
              <GlassBadge tone="amber">
                {db.activeCutoff === '1st_kinsenas'
                  ? '15th Cutoff'
                  : db.activeCutoff === '2nd_kinsenas'
                  ? '30th Cutoff'
                  : 'Full Month'}
              </GlassBadge>
            </div>
          </GlassCard>

          {/* Tile 4: Safety Score */}
          <GlassCard glowColor={debtBadgeTone} className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Safety Score
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-emerald-300">
              {metrics.utangDebtToIncomePercent}%{' '}
              <span className="text-base font-extrabold uppercase tracking-wider text-slate-300">
                DTI • {metrics.utangDebtStatus.toUpperCase()}
              </span>
            </p>
            <div className="mt-2">
              <GlassProgressBar
                value={metrics.utangDebtToIncomePercent}
                max={40}
                tone={debtBadgeTone}
                height="sm"
              />
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ===================================================================
          SUB-TAB SWITCHER & CATEGORY FILTER
         =================================================================== */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Sub-Tabs */}
          <div className="inline-flex rounded-2xl bg-slate-950/75 p-1.5 border border-white/[0.1]">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('utang_ko');
                setSelectedCategory('ALL');
              }}
              className={`min-h-[44px] flex items-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeSubTab === 'utang_ko'
                  ? 'bg-gradient-to-r from-rose-500/30 to-amber-500/25 text-rose-100 border border-rose-400/35 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Utang Ko ({db.utangs.filter((u) => u.direction === 'utang_ko').length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('utang_nila');
                setSelectedCategory('ALL');
              }}
              className={`min-h-[44px] flex items-center gap-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeSubTab === 'utang_nila'
                  ? 'bg-gradient-to-r from-teal-500/30 to-emerald-500/25 text-teal-100 border border-teal-400/35 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Utang Nila ({db.utangs.filter((u) => u.direction === 'utang_nila').length})
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Category
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-h-[44px] rounded-xl glass-input px-3 text-xs font-semibold text-slate-200 focus:outline-none"
            >
              <option value="ALL" className="bg-slate-900">
                All Categories
              </option>
              {UTANG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900">
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ===================================================================
            SUB-TAB 1: UTANG KO CARDS
           =================================================================== */}
        {activeSubTab === 'utang_ko' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {utangKoList.map((utang) => {
              const remaining = Math.max(
                0,
                utang.totalAmount - utang.paidAmount
              );
              const isPaid = utang.status === 'paid' || remaining === 0;
              const isHistoryOpen = !!expandedHistoryIds[utang.id];

              return (
                <GlassCard
                  key={utang.id}
                  glowColor={isPaid ? 'emerald' : 'rose'}
                  className={`p-5 sm:p-6 flex flex-col justify-between space-y-4 bm-spring-row ${
                    recentlyPaidUtangId === utang.id ? 'bm-wallet-deduct-ripple' : ''
                  } ${isPaid ? 'bm-spring-checked' : ''}`}
                >
                  {/* Top Header: Lender Name & Short Due Date Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-lg font-bold bm-strike ${
                            isPaid ? 'is-struck text-emerald-200' : 'text-slate-100'
                          }`}
                        >
                          {utang.personOrLender}
                        </h3>
                        <GlassBadge
                          tone={utang.purposePillar === 'need' ? 'emerald' : 'amber'}
                        >
                          {utang.purposePillar === 'need' ? 'Need' : 'Want'}
                        </GlassBadge>
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">
                        {utang.purpose}
                      </p>
                    </div>

                    <GlassBadge tone={isPaid ? 'emerald' : 'rose'}>
                      {isPaid ? 'Paid' : utang.dueDate}
                    </GlassBadge>
                  </div>

                  {/* Big Remaining Balance + Monthly Hulog */}
                  <div className="flex items-baseline justify-between p-4 rounded-2xl bg-slate-950/60 border border-white/[0.07]">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Remaining Balance
                      </span>
                      <span className="text-2xl sm:text-3xl font-black tabular-nums text-rose-200">
                        {formatPeso(remaining, privacyMode)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Monthly Hulog
                      </span>
                      <span className="text-xl font-extrabold tabular-nums text-amber-300">
                        {formatPeso(utang.monthlyInstallment, privacyMode)}
                      </span>
                    </div>
                  </div>

                  {/* Thick Hulugan Progress Bar */}
                  <div>
                    <GlassProgressBar
                      value={utang.paidAmount}
                      max={utang.totalAmount}
                      tone={isPaid ? 'emerald' : 'amber'}
                      labelLeft={`${utang.paidMonths} / ${utang.totalMonths} mos`}
                      labelRight={`${Math.round(
                        (utang.paidAmount / Math.max(1, utang.totalAmount)) * 100
                      )}%`}
                      height="lg"
                    />
                  </div>

                  {/* Bottom Actions & History Toggle */}
                  <div className="pt-3 border-t border-white/[0.08] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHistoryDrawer(utang.id)}
                        className="min-h-[44px] px-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                      >
                        <History className="w-4 h-4 text-teal-300" />
                        <span>History ({utang.paymentHistory.length})</span>
                        {isHistoryOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isPaid && (
                          <>
                            <GlassButton
                              variant="secondary"
                              size="md"
                              className="min-h-[44px]"
                              onClick={() => openPaymentModal(utang, true)}
                            >
                              Pay Full
                            </GlassButton>
                            <GlassButton
                              variant="primary"
                              size="md"
                              className="min-h-[44px]"
                              onClick={() => openPaymentModal(utang, false)}
                            >
                              <WalletIcon className="w-4 h-4" />
                              Pay / Hulog
                            </GlassButton>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteUtang(utang.id)}
                          aria-label={`Delete ${utang.personOrLender}`}
                          title={`Delete ${utang.personOrLender}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-400/35 transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isHistoryOpen && (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.07] space-y-2 text-xs">
                        {utang.paymentHistory.length === 0 ? (
                          <p className="text-slate-400">No payments yet</p>
                        ) : (
                          utang.paymentHistory.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between py-1 border-b border-white/[0.05] last:border-0"
                            >
                              <div>
                                <span className="text-slate-200 font-semibold">
                                  {log.date}
                                </span>
                                <span className="text-slate-400 ml-2 uppercase">
                                  {log.walletId}
                                </span>
                              </div>
                              <span className="font-bold tabular-nums text-emerald-300">
                                -{formatPeso(log.amount, privacyMode)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* ===================================================================
            SUB-TAB 2: UTANG NILA CARDS
           =================================================================== */}
        {activeSubTab === 'utang_nila' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {utangNilaList.map((utang) => {
              const remaining = Math.max(
                0,
                utang.totalAmount - utang.paidAmount
              );
              const isPaid = utang.status === 'paid' || remaining === 0;
              const isHistoryOpen = !!expandedHistoryIds[utang.id];

              return (
                <GlassCard
                  key={utang.id}
                  glowColor={isPaid ? 'emerald' : 'teal'}
                  className={`p-5 sm:p-6 flex flex-col justify-between space-y-4 bm-spring-row ${
                    recentlyPaidUtangId === utang.id ? 'bm-wallet-deduct-ripple' : ''
                  } ${isPaid ? 'bm-spring-checked' : ''}`}
                >
                  {/* Header: Person Name & Due Date Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-lg font-bold bm-strike ${
                            isPaid ? 'is-struck text-emerald-200' : 'text-slate-100'
                          }`}
                        >
                          {utang.personOrLender}
                        </h3>
                        <GlassBadge tone="teal">{utang.category}</GlassBadge>
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">
                        {utang.purpose}
                      </p>
                    </div>

                    <GlassBadge tone={isPaid ? 'emerald' : 'amber'}>
                      {isPaid ? 'Cleared' : utang.dueDate}
                    </GlassBadge>
                  </div>

                  {/* Big Remaining Balance + Collected */}
                  <div className="flex items-baseline justify-between p-4 rounded-2xl bg-slate-950/60 border border-white/[0.07]">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Remaining Balance
                      </span>
                      <span className="text-2xl sm:text-3xl font-black tabular-nums text-teal-200">
                        {formatPeso(remaining, privacyMode)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                        Collected
                      </span>
                      <span className="text-xl font-extrabold tabular-nums text-emerald-300">
                        {formatPeso(utang.paidAmount, privacyMode)}
                      </span>
                    </div>
                  </div>

                  {/* Thick Hulugan Progress Bar */}
                  <div>
                    <GlassProgressBar
                      value={utang.paidAmount}
                      max={utang.totalAmount}
                      tone="teal"
                      labelLeft={`${utang.paidMonths} / ${utang.totalMonths} mos`}
                      labelRight={`${Math.round(
                        (utang.paidAmount / Math.max(1, utang.totalAmount)) * 100
                      )}%`}
                      height="lg"
                    />
                  </div>

                  {/* Bottom 1-Tap Singil Card & Collect Buttons */}
                  <div className="pt-3 border-t border-white/[0.08] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleHistoryDrawer(utang.id)}
                        className="min-h-[44px] px-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                      >
                        <History className="w-4 h-4 text-teal-300" />
                        <span>History ({utang.paymentHistory.length})</span>
                        {isHistoryOpen ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        <GlassButton
                          variant="amber"
                          size="md"
                          className="min-h-[44px]"
                          onClick={() => setSingilModalUtang(utang)}
                        >
                          <MessageSquareShare className="w-4 h-4" />
                          Singil Card
                        </GlassButton>

                        {!isPaid && (
                          <GlassButton
                            variant="primary"
                            size="md"
                            className="min-h-[44px]"
                            onClick={() => openPaymentModal(utang, false)}
                          >
                            <WalletIcon className="w-4 h-4" />
                            Collect
                          </GlassButton>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteUtang(utang.id)}
                          aria-label={`Delete ${utang.personOrLender}`}
                          title={`Delete ${utang.personOrLender}`}
                          className="min-w-[44px] min-h-[44px] rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-400/35 transition-all cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isHistoryOpen && (
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.07] space-y-2 text-xs">
                        {utang.paymentHistory.length === 0 ? (
                          <p className="text-slate-400">No collections yet</p>
                        ) : (
                          utang.paymentHistory.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between py-1 border-b border-white/[0.05] last:border-0"
                            >
                              <div>
                                <span className="text-slate-200 font-semibold">
                                  {log.date}
                                </span>
                                <span className="text-slate-400 ml-2 uppercase">
                                  {log.walletId}
                                </span>
                              </div>
                              <span className="font-bold tabular-nums text-teal-300">
                                +{formatPeso(log.amount, privacyMode)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================================
          MODAL 1: PAY / HULOG OR COLLECT
         =================================================================== */}
      <GlassModal
        isOpen={!!paymentModalUtang}
        onClose={() => setPaymentModalUtang(null)}
        title={
          paymentModalUtang?.direction === 'utang_ko'
            ? `Pay / Hulog: ${paymentModalUtang.personOrLender}`
            : `Collect: ${paymentModalUtang?.personOrLender}`
        }
      >
        {paymentModalUtang && (
          <form onSubmit={handleConfirmPayment} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Remaining Balance
              </span>
              <span className="text-2xl font-black tabular-nums text-amber-300">
                {formatPeso(
                  Math.max(
                    0,
                    paymentModalUtang.totalAmount -
                      paymentModalUtang.paidAmount
                  ),
                  privacyMode
                )}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Amount (₱)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full min-h-[44px] rounded-xl glass-input px-3.5 text-base font-bold tabular-nums text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Wallet
              </label>
              <select
                value={paymentWalletId}
                onChange={(e) => setPaymentWalletId(e.target.value as WalletId)}
                className="w-full min-h-[44px] rounded-xl glass-input px-3.5 text-sm font-semibold text-slate-100"
              >
                {db.wallets.map((w) => (
                  <option key={w.id} value={w.id} className="bg-slate-900">
                    {w.name} ({formatPeso(w.balance, privacyMode)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Note
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Optional reference"
                className="w-full min-h-[44px] rounded-xl glass-input px-3.5 text-sm text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
              <GlassButton
                variant="ghost"
                size="md"
                className="min-h-[44px]"
                onClick={() => setPaymentModalUtang(null)}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                size="md"
                className="min-h-[44px]"
                type="submit"
              >
                Confirm
              </GlassButton>
            </div>
          </form>
        )}
      </GlassModal>

      {/* ===================================================================
          MODAL 2: SINGIL CARD
         =================================================================== */}
      <GlassModal
        isOpen={!!singilModalUtang}
        onClose={() => setSingilModalUtang(null)}
        title="Singil Reminder Card"
      >
        {singilModalUtang && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Receiving Account
              </label>
              <input
                type="text"
                value={gcashReceivingInfo}
                onChange={(e) => setGcashReceivingInfo(e.target.value)}
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-xs text-slate-200"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-teal-400/30 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {generateSingilStatementText(
                singilModalUtang,
                gcashReceivingInfo
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <GlassButton
                variant="ghost"
                size="md"
                className="min-h-[44px]"
                onClick={() => setSingilModalUtang(null)}
              >
                Close
              </GlassButton>
              <GlassButton
                variant="primary"
                size="md"
                className="min-h-[44px]"
                onClick={handleCopySingilText}
              >
                {copiedStatement ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Statement
                  </>
                )}
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>

      {/* ===================================================================
          MODAL 3: ADD UTANG MODAL
         =================================================================== */}
      <GlassModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Utang Record"
      >
        <form onSubmit={handleAddUtangSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/70 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setNewDirection('utang_ko')}
              className={`min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                newDirection === 'utang_ko'
                  ? 'bg-rose-500/25 text-rose-200 border border-rose-400/35'
                  : 'text-slate-400'
              }`}
            >
              Utang Ko (We Owe)
            </button>
            <button
              type="button"
              onClick={() => {
                setNewDirection('utang_nila');
                setNewCategory('Household Abono');
              }}
              className={`min-h-[44px] rounded-lg text-xs font-bold transition-all ${
                newDirection === 'utang_nila'
                  ? 'bg-teal-500/25 text-teal-200 border border-teal-400/35'
                  : 'text-slate-400'
              }`}
            >
              Utang Nila (Collectible)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                {newDirection === 'utang_ko' ? 'Lender Name' : 'Person Name'}
              </label>
              <input
                type="text"
                required
                value={newPersonOrLender}
                onChange={(e) => setNewPersonOrLender(e.target.value)}
                placeholder={
                  newDirection === 'utang_ko' ? 'Home Credit' : 'Kuya Jun'
                }
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) =>
                  setNewCategory(e.target.value as UtangCategory)
                }
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              >
                {UTANG_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Purpose
              </label>
              <input
                type="text"
                required
                value={newPurpose}
                onChange={(e) => setNewPurpose(e.target.value)}
                placeholder="Item or purpose"
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Pillar
              </label>
              <select
                value={newPurposePillar}
                onChange={(e) =>
                  setNewPurposePillar(e.target.value as 'need' | 'want')
                }
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              >
                <option value="need" className="bg-slate-900">
                  Need
                </option>
                <option value="want" className="bg-slate-900">
                  Want
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Total Amount (₱)
              </label>
              <input
                type="number"
                required
                value={newTotalAmount}
                onChange={(e) => setNewTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm font-bold tabular-nums text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Months
              </label>
              <input
                type="number"
                min={1}
                value={newTotalMonths}
                onChange={(e) => setNewTotalMonths(e.target.value)}
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm font-bold tabular-nums text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Monthly Hulog (₱)
              </label>
              <input
                type="number"
                value={newMonthlyInstallment}
                onChange={(e) => setNewMonthlyInstallment(e.target.value)}
                placeholder="Auto"
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm font-bold tabular-nums text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Due Date
              </label>
              <input
                type="text"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                placeholder="Every 15th"
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Cutoff
              </label>
              <select
                value={newCutoff}
                onChange={(e) =>
                  setNewCutoff(
                    e.target.value as '1st_kinsenas' | '2nd_kinsenas'
                  )
                }
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              >
                <option value="1st_kinsenas" className="bg-slate-900">
                  15th Cutoff
                </option>
                <option value="2nd_kinsenas" className="bg-slate-900">
                  30th Cutoff
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Contact
              </label>
              <input
                type="text"
                value={newContactInfo}
                onChange={(e) => setNewContactInfo(e.target.value)}
                placeholder="Optional"
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <GlassButton
              variant="ghost"
              size="md"
              className="min-h-[44px]"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              size="md"
              className="min-h-[44px]"
              type="submit"
            >
              Save Utang
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
export default UtangHubView;
