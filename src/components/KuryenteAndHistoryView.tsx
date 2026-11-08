import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Gauge,
  CheckCircle2,
  Sliders,
  Receipt,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Flame,
  Droplets,
  Wifi,
  Home,
  Sparkles,
  Calendar,
  Wallet as WalletIcon,
  PlusCircle,
  PiggyBank,
  Trash2,
} from 'lucide-react';
import {
  HouseholdDatabaseState,
  KuryenteBill,
  WalletId,
} from '../types/database';
import {
  calculateKuryenteMetrics,
  calculateSixMonthAnalytics,
} from '../services/householdEngine';
import {
  GlassCard,
  GlassButton,
  GlassBadge,
  GlassProgressBar,
  GlassSectionHeader,
  GlassModal,
  formatPeso,
  AnimatedPeso,
} from './ui/GlassComponents';

export interface KuryenteAndHistoryViewProps {
  db: HouseholdDatabaseState;
  privacyMode: boolean;
  onPayUtilityBill: (billId: string, walletId: WalletId) => void;
  onSaveKuryenteReading: (bill: Omit<KuryenteBill, 'id'>) => void;
  onUpdateKuryenteBudget: (newBudget: number) => void;
  onUpdateApplianceHours: (applianceId: string, hoursPerDay: number) => void;
  onDeleteUtilityBill: (billId: string) => void;
  onDeleteKuryenteReading: (kuryenteId: string) => void;
}

type ChartMode = 'kuryente' | 'income' | 'pillars';

export const KuryenteAndHistoryView: React.FC<KuryenteAndHistoryViewProps> = ({
  db,
  privacyMode,
  onPayUtilityBill,
  onSaveKuryenteReading,
  onUpdateKuryenteBudget,
  onUpdateApplianceHours,
  onDeleteUtilityBill,
  onDeleteKuryenteReading,
}) => {
  const latestBill = db.kuryenteBills[0];

  // Section A state: Calculator mode & readings
  const [calcMode, setCalcMode] = useState<'direct_meralco' | 'submeter'>(
    latestBill?.mode || 'submeter'
  );
  const [prevReading, setPrevReading] = useState<number>(
    latestBill ? latestBill.prevReading : 0
  );
  const [currReading, setCurrReading] = useState<number>(
    latestBill ? latestBill.currReading : 0
  );
  const [ratePerKwh, setRatePerKwh] = useState<number>(
    latestBill ? latestBill.ratePerKwh : 11.85
  );
  const [directKwh, setDirectKwh] = useState<number>(
    latestBill ? latestBill.kwhUsed : 0
  );

  useEffect(() => {
    setPrevReading(latestBill ? latestBill.prevReading : 0);
    setCurrReading(latestBill ? latestBill.currReading : 0);
    setDirectKwh(latestBill ? latestBill.kwhUsed : 0);
    setBudgetInput(String(db.kuryenteBudget));
  }, [latestBill?.id, db.kuryenteBudget]);

  // Modal to log/save new monthly Kuryente reading
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newBillMonth, setNewBillMonth] = useState('November 2026');
  const [newBillPeriod, setNewBillPeriod] = useState('Oct 16 - Nov 15, 2026');
  const [newBillDueDate, setNewBillDueDate] = useState('2026-11-28');
  const [newBillNotes, setNewBillNotes] = useState('');

  // Budget inline edit
  const [budgetInput, setBudgetInput] = useState<string>(
    String(db.kuryenteBudget)
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Section C: selected wallet per utility bill
  const [billWallets, setBillWallets] = useState<Record<string, WalletId>>({});

  // Section D: 6-Month Chart Switcher & Month Inspector
  const [chartMode, setChartMode] = useState<ChartMode>('kuryente');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    db.sixMonthHistory[db.sixMonthHistory.length - 1]?.monthKey || '2026-11'
  );

  // Compute Kuryente Metrics based on mode
  const effectivePrev = calcMode === 'submeter' ? prevReading : 0;
  const effectiveCurr = calcMode === 'submeter' ? currReading : directKwh;

  const kuryenteMetrics = useMemo(
    () =>
      calculateKuryenteMetrics(
        db,
        effectivePrev,
        effectiveCurr,
        ratePerKwh
      ),
    [db, effectivePrev, effectiveCurr, ratePerKwh]
  );

  const sixMonthAnalytics = useMemo(
    () => calculateSixMonthAnalytics(db.sixMonthHistory),
    [db.sixMonthHistory]
  );

  const selectedSnapshot = useMemo(
    () =>
      db.sixMonthHistory.find((m) => m.monthKey === selectedMonthKey) ||
      db.sixMonthHistory[db.sixMonthHistory.length - 1],
    [db.sixMonthHistory, selectedMonthKey]
  );

  const handleSaveReadingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKuryenteReading({
      month: newBillMonth,
      billingPeriod: newBillPeriod,
      mode: calcMode,
      prevReading: calcMode === 'submeter' ? prevReading : 0,
      currReading: calcMode === 'submeter' ? currReading : directKwh,
      kwhUsed: kuryenteMetrics.kwhUsed,
      ratePerKwh: kuryenteMetrics.ratePerKwh,
      totalAmount: kuryenteMetrics.totalCost,
      dueDate: newBillDueDate,
      status: 'unpaid',
      paidAmount: 0,
      notes:
        newBillNotes.trim() ||
        `${calcMode === 'submeter' ? 'Submeter' : 'Direct Meralco'} reading`,
    });
    setIsLogModalOpen(false);
    setSavedNotice('Reading saved');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  const handleApplyBudget = () => {
    const parsed = Number(budgetInput);
    if (Number.isFinite(parsed) && parsed > 0) {
      onUpdateKuryenteBudget(Math.round(parsed));
      setSavedNotice(`Budget cap set to ₱${Math.round(parsed).toLocaleString()}`);
      setTimeout(() => setSavedNotice(null), 3500);
    }
  };

  const handleUseSixMonthSafeAvg = () => {
    if (sixMonthAnalytics.avgKuryentePeso > 0) {
      onUpdateKuryenteBudget(sixMonthAnalytics.avgKuryentePeso);
      setBudgetInput(String(sixMonthAnalytics.avgKuryentePeso));
      setSavedNotice(
        `6-Mo Avg (₱${sixMonthAnalytics.avgKuryentePeso.toLocaleString()}) applied`
      );
      setTimeout(() => setSavedNotice(null), 4000);
    }
  };

  const getUtilityIcon = (type: string) => {
    if (type.includes('Kuryente')) return <Zap className="w-5 h-5 text-amber-300" />;
    if (type.includes('Tubig')) return <Droplets className="w-5 h-5 text-cyan-300" />;
    if (type.includes('Wi-Fi') || type.includes('Internet'))
      return <Wifi className="w-5 h-5 text-indigo-300" />;
    if (type.includes('LPG')) return <Flame className="w-5 h-5 text-orange-300" />;
    return <Home className="w-5 h-5 text-emerald-300" />;
  };

  return (
    <div className="space-y-8 pb-10">
      {savedNotice && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 text-sm backdrop-blur-md">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{savedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedNotice(null)}
            className="text-xs font-bold text-emerald-300 hover:underline min-h-[44px] px-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ===================================================================
          SECTION A: KURYENTE COMMAND CENTER
         =================================================================== */}
      <section className="space-y-4">
        <GlassSectionHeader
          title="Kuryente Command Center"
          icon={<Zap className="w-5 h-5" />}
          action={
            <GlassButton
              variant="amber"
              size="md"
              className="min-h-[44px]"
              onClick={() => setIsLogModalOpen(true)}
            >
              <PlusCircle className="w-4 h-4" />
              Save Reading
            </GlassButton>
          }
        />

        {/* 4 GIANT HIGH-CONTRAST METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Total Bill */}
          <GlassCard glowColor="amber" className="p-5 flex flex-col justify-between bm-kuryente-pulse">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Total Bill
              </span>
              <Zap className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-amber-300">
              <AnimatedPeso amount={kuryenteMetrics.totalCost} privacyMode={privacyMode} />
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>@ ₱{kuryenteMetrics.ratePerKwh.toFixed(2)}/kWh</span>
              <GlassBadge tone={kuryenteMetrics.isWithinBudget ? 'emerald' : 'rose'}>
                {kuryenteMetrics.isWithinBudget ? 'Within Cap' : 'Over Cap'}
              </GlassBadge>
            </div>
          </GlassCard>

          {/* Tile 2: Power Used */}
          <GlassCard glowColor="teal" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Power Used
              </span>
              <Gauge
                className="w-5 h-5 text-teal-300 transition-transform duration-500"
                style={{
                  transform: `rotate(${Math.min(180, Math.round(kuryenteMetrics.kwhUsed * 0.6))}deg)`,
                }}
              />
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-slate-100">
              {kuryenteMetrics.kwhUsed.toLocaleString()}{' '}
              <span className="text-lg font-bold text-slate-400">kWh</span>
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Avg Daily</span>
              <span className="font-bold text-teal-200 tabular-nums">
                {kuryenteMetrics.actualDailyKwhAverage} kWh/day
              </span>
            </div>
          </GlassCard>

          {/* Tile 3: 15th / 30th Set-Aside */}
          <GlassCard glowColor="emerald" className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                15th / 30th Set-Aside
              </span>
              <PiggyBank className="w-5 h-5 text-emerald-300" />
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-emerald-300">
              <AnimatedPeso amount={kuryenteMetrics.kinsenasHalfSetAside} privacyMode={privacyMode} />
              <span className="text-sm font-bold text-slate-400"> / cutoff</span>
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Half Split</span>
              <span className="text-emerald-200 font-semibold">Kinsenas Ready</span>
            </div>
          </GlassCard>

          {/* Tile 4: Daily kWh Limit */}
          <GlassCard
            glowColor={kuryenteMetrics.isWithinBudget ? 'emerald' : 'rose'}
            className="p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Daily kWh Limit
              </span>
              <Sliders className="w-5 h-5 text-indigo-300" />
            </div>
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-indigo-200">
              {kuryenteMetrics.targetDailyKwhAllowance}{' '}
              <span className="text-base font-bold text-slate-400">kWh/day</span>
            </p>
            <div className="mt-2">
              <GlassProgressBar
                value={kuryenteMetrics.actualDailyKwhAverage}
                max={Math.max(
                  kuryenteMetrics.targetDailyKwhAllowance * 1.3,
                  kuryenteMetrics.actualDailyKwhAverage,
                  1
                )}
                tone={
                  kuryenteMetrics.actualDailyKwhAverage <=
                  kuryenteMetrics.targetDailyKwhAllowance
                    ? 'emerald'
                    : 'rose'
                }
                height="sm"
              />
            </div>
          </GlassCard>
        </div>

        {/* TOUCH-FRIENDLY INPUT BAR */}
        <GlassCard className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="inline-flex rounded-xl bg-slate-950/75 p-1 border border-white/[0.1]">
              <button
                type="button"
                onClick={() => setCalcMode('submeter')}
                className={`min-h-[44px] px-4 rounded-lg text-xs font-bold transition-all ${
                  calcMode === 'submeter'
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/35'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Submeter Mode
              </button>
              <button
                type="button"
                onClick={() => setCalcMode('direct_meralco')}
                className={`min-h-[44px] px-4 rounded-lg text-xs font-bold transition-all ${
                  calcMode === 'direct_meralco'
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/35'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Direct Bill
              </button>
            </div>

            {/* Budget Cap Quick Edit */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Budget Cap (₱)
              </span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-28 min-h-[44px] rounded-xl glass-input px-3 text-sm font-bold tabular-nums text-slate-100 focus:outline-none"
              />
              <GlassButton
                variant="secondary"
                size="md"
                className="min-h-[44px]"
                onClick={handleApplyBudget}
              >
                Set Cap
              </GlassButton>
            </div>
          </div>

          {calcMode === 'submeter' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Prev kWh
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={prevReading}
                  onChange={(e) => setPrevReading(Number(e.target.value) || 0)}
                  className="w-full min-h-[44px] rounded-xl glass-input px-3.5 text-base font-bold tabular-nums text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Curr kWh
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={currReading}
                  onChange={(e) => setCurrReading(Number(e.target.value) || 0)}
                  className="w-full min-h-[44px] rounded-xl glass-input px-3.5 text-base font-bold tabular-nums text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Rate (₱/kWh)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={ratePerKwh}
                  onChange={(e) => setRatePerKwh(Number(e.target.value) || 0)}
                  className="w-full min-h-[44px] rounded-xl glass-input px-3.5 text-base font-bold tabular-nums text-amber-300 focus:outline-none"
                />
              </div>
            </div>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Power Used (kWh)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={directKwh}
                    onChange={(e) => setDirectKwh(Number(e.target.value) || 0)}
                    className="w-full min-h-[44px] rounded-xl glass-input px-3.5 text-base font-bold tabular-nums text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Rate (₱/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={ratePerKwh}
                    onChange={(e) => setRatePerKwh(Number(e.target.value) || 0)}
                    className="w-full min-h-[44px] rounded-xl glass-input px-3.5 text-base font-bold tabular-nums text-amber-300 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </GlassCard>

          {/* LOGGED KURYENTE READINGS LIST */}
          {db.kuryenteBills.length > 0 && (
            <GlassCard className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Logged Kuryente Readings ({db.kuryenteBills.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {db.kuryenteBills.map((kb) => (
                  <div
                    key={kb.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate">
                        {kb.month}
                      </p>
                      <p className="text-xs text-slate-400 tabular-nums">
                        {kb.kwhUsed} kWh • {formatPeso(kb.totalAmount, privacyMode)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteKuryenteReading(kb.id)}
                      aria-label={`Delete ${kb.month} reading`}
                      title={`Delete ${kb.month} reading`}
                      className="min-w-[44px] min-h-[44px] rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-400/35 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </section>

      {/* ===================================================================
          SECTION B: APPLIANCE COST ESTIMATOR
         =================================================================== */}
      <section className="space-y-4">
        <GlassSectionHeader
          title="Appliance Cost Estimator"
          icon={<Sliders className="w-5 h-5" />}
          action={
            <div className="flex items-center gap-2">
              <GlassBadge tone="amber">
                {kuryenteMetrics.estimatedApplianceTotalKwh} kWh/mo
              </GlassBadge>
              <GlassBadge tone="teal">
                {formatPeso(
                  kuryenteMetrics.estimatedApplianceTotalPeso,
                  privacyMode
                )}
                /mo
              </GlassBadge>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kuryenteMetrics.applianceBreakdown.map((app) => {
            const isHeavy = app.sharePercent >= 28;
            return (
              <GlassCard
                key={app.id}
                glowColor={isHeavy ? 'amber' : 'none'}
                className="p-5 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-slate-100">
                      {app.name}
                    </h4>
                    <span className="text-xs font-semibold text-slate-400 tabular-nums">
                      {app.watts}W • {app.monthlyKwh} kWh/mo
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold tabular-nums text-amber-300">
                      {formatPeso(app.monthlyPeso, privacyMode)}
                      <span className="text-xs font-normal text-slate-400">/mo</span>
                    </p>
                  </div>
                </div>

                {/* Share % Bar */}
                <div>
                  <GlassProgressBar
                    value={app.sharePercent}
                    max={100}
                    tone={isHeavy ? 'amber' : 'teal'}
                    labelLeft="Bill Share"
                    labelRight={`${app.sharePercent}%`}
                    height="md"
                  />
                </div>

                {/* hrs/day Slider */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold uppercase tracking-wider text-slate-400">
                      Usage
                    </span>
                    <span className="font-extrabold text-teal-200 tabular-nums">
                      {app.hoursPerDay} hrs/day
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={24}
                    step={0.5}
                    value={app.hoursPerDay}
                    onChange={(e) =>
                      onUpdateApplianceHours(
                        app.id,
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full accent-teal-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* ===================================================================
          SECTION C: HOUSE BILLS CHECKLIST
         =================================================================== */}
      <section className="space-y-4">
        <GlassSectionHeader
          title="House Bills Checklist"
          icon={<Receipt className="w-5 h-5" />}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {db.utilityBills.map((bill) => {
            const selectedWallet =
              billWallets[bill.id] || db.wallets[0]?.id || 'gcash';
            const isPaid = bill.status === 'paid';

            return (
              <GlassCard
                key={bill.id}
                glowColor={isPaid ? 'emerald' : 'amber'}
                className="p-5 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1]">
                      {getUtilityIcon(bill.type)}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-100">
                        {bill.type}
                      </h4>
                      <p className="text-xs text-slate-400">{bill.provider}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <GlassBadge tone={isPaid ? 'emerald' : 'amber'}>
                      {isPaid ? 'Paid' : `Due ${bill.dueDate}`}
                    </GlassBadge>
                    <button
                      type="button"
                      onClick={() => onDeleteUtilityBill(bill.id)}
                      aria-label={`Delete ${bill.type} bill`}
                      title={`Delete ${bill.type} bill`}
                      className="min-w-[44px] min-h-[44px] rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-400/35 transition-all cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between p-3.5 rounded-xl bg-slate-950/55 border border-white/[0.07]">
                  <span className="text-2xl font-extrabold tabular-nums text-slate-100">
                    {formatPeso(bill.amount, privacyMode)}
                  </span>
                  <GlassBadge
                    tone={bill.cutoff === '1st_kinsenas' ? 'teal' : 'indigo'}
                  >
                    {bill.cutoff === '1st_kinsenas' ? '15th Cutoff' : '30th Cutoff'}
                  </GlassBadge>
                </div>

                {isPaid ? (
                  <div className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Paid ({bill.lastPaidDate || 'Done'})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={selectedWallet}
                        onChange={(e) =>
                          setBillWallets((prev) => ({
                            ...prev,
                            [bill.id]: e.target.value as WalletId,
                          }))
                        }
                        className="w-full min-h-[44px] rounded-xl glass-input px-3 text-xs font-semibold text-slate-200 focus:outline-none"
                      >
                        {db.wallets.map((w) => (
                          <option
                            key={w.id}
                            value={w.id}
                            className="bg-slate-900 text-slate-100"
                          >
                            {w.name} ({formatPeso(w.balance, privacyMode)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <GlassButton
                      variant="primary"
                      size="md"
                      className="min-h-[44px] shrink-0"
                      onClick={() => onPayUtilityBill(bill.id, selectedWallet)}
                    >
                      <WalletIcon className="w-4 h-4" />
                      Pay Now
                    </GlassButton>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* ===================================================================
          SECTION D: 6-MONTH HISTORY (JUNE - NOV)
         =================================================================== */}
      <section className="space-y-4">
        <GlassSectionHeader
          title="6-Month History (June – Nov)"
          icon={<BarChart3 className="w-5 h-5" />}
          action={
            <GlassButton
              variant="secondary"
              size="md"
              className="min-h-[44px]"
              onClick={handleUseSixMonthSafeAvg}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Apply 6-Mo Avg Cap
            </GlassButton>
          }
        />

        {/* 3 CLEAN KPI PILLS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard glowColor="amber" className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                6-Mo Avg
              </span>
              <p className="text-2xl font-black tabular-nums text-amber-300 mt-0.5">
                {formatPeso(sixMonthAnalytics.avgKuryentePeso, privacyMode)}
              </p>
            </div>
            <GlassBadge tone="amber">
              {sixMonthAnalytics.avgKuryenteKwh} kWh
            </GlassBadge>
          </GlassCard>

          <GlassCard glowColor="rose" className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Peak Month
              </span>
              <p className="text-2xl font-black tabular-nums text-rose-300 mt-0.5">
                {formatPeso(
                  sixMonthAnalytics.highestKuryenteMonth?.kuryenteAmount || 0,
                  privacyMode
                )}
              </p>
            </div>
            <GlassBadge tone="rose">
              <TrendingUp className="w-3.5 h-3.5" />
              {sixMonthAnalytics.highestKuryenteMonth?.monthLabel.split(' ')[0] || '-'}
            </GlassBadge>
          </GlassCard>

          <GlassCard glowColor="emerald" className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Lowest Month
              </span>
              <p className="text-2xl font-black tabular-nums text-emerald-300 mt-0.5">
                {formatPeso(
                  sixMonthAnalytics.lowestKuryenteMonth?.kuryenteAmount || 0,
                  privacyMode
                )}
              </p>
            </div>
            <GlassBadge tone="emerald">
              <TrendingDown className="w-3.5 h-3.5" />
              {sixMonthAnalytics.lowestKuryenteMonth?.monthLabel.split(' ')[0] || '-'}
            </GlassBadge>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left 7 cols: Giant Visual Bar Chart with Direct Labeling */}
          <GlassCard className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="inline-flex rounded-xl bg-slate-950/75 p-1 border border-white/[0.1]">
                <button
                  type="button"
                  onClick={() => setChartMode('kuryente')}
                  className={`min-h-[40px] px-3.5 rounded-lg text-xs font-bold transition-all ${
                    chartMode === 'kuryente'
                      ? 'bg-amber-500/25 text-amber-200 border border-amber-400/35'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kuryente
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('income')}
                  className={`min-h-[40px] px-3.5 rounded-lg text-xs font-bold transition-all ${
                    chartMode === 'income'
                      ? 'bg-teal-500/25 text-teal-200 border border-teal-400/35'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('pillars')}
                  className={`min-h-[40px] px-3.5 rounded-lg text-xs font-bold transition-all ${
                    chartMode === 'pillars'
                      ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/35'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Outflows
                </button>
              </div>
            </div>

            {/* Giant Visual Bars with Direct Top Labels */}
            <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-64 pt-8 pb-2 px-2 rounded-2xl bg-slate-950/55 border border-white/[0.07]">
              {db.sixMonthHistory.map((snap) => {
                const shortMonth = snap.monthLabel.split(' ')[0];
                const isSelected = snap.monthKey === selectedSnapshot?.monthKey;

                if (chartMode === 'kuryente') {
                  const maxKuryente = Math.max(
                    ...db.sixMonthHistory.map((m) => m.kuryenteAmount),
                    1
                  );
                  const heightPct = Math.max(
                    16,
                    Math.round((snap.kuryenteAmount / maxKuryente) * 100)
                  );
                  const isPeak =
                    snap.monthKey ===
                    sixMonthAnalytics.highestKuryenteMonth?.monthKey;
                  const isLow =
                    snap.monthKey ===
                    sixMonthAnalytics.lowestKuryenteMonth?.monthKey;

                  return (
                    <button
                      key={snap.monthKey}
                      type="button"
                      onClick={() => setSelectedMonthKey(snap.monthKey)}
                      className={`flex flex-col items-center justify-end h-full rounded-xl p-1.5 transition-all ${
                        isSelected
                          ? 'bg-white/[0.09] ring-1 ring-amber-400/60'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="text-xs font-extrabold tabular-nums text-amber-200 mb-0.5">
                        {formatPeso(snap.kuryenteAmount, privacyMode)}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums text-slate-400 mb-1.5">
                        {snap.kuryenteKwh}kWh
                      </span>
                      <div className="w-full flex-1 flex items-end justify-center">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full max-w-[42px] rounded-t-xl transition-all ${
                            isPeak
                              ? 'bg-gradient-to-t from-rose-500/85 to-amber-400'
                              : isLow
                              ? 'bg-gradient-to-t from-emerald-500/85 to-teal-300'
                              : 'bg-gradient-to-t from-amber-500/80 to-yellow-300/90'
                          }`}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-100 mt-2">
                        {shortMonth}
                      </span>
                    </button>
                  );
                }

                if (chartMode === 'income') {
                  const maxInc = Math.max(
                    ...db.sixMonthHistory.map((m) => m.totalIncome),
                    1
                  );
                  const totalH = Math.max(
                    18,
                    Math.round((snap.totalIncome / maxInc) * 100)
                  );
                  const allowPct = Math.round(
                    (snap.allowanceIncome / snap.totalIncome) * 100
                  );
                  const salPct = Math.round(
                    (snap.salaryIncome / snap.totalIncome) * 100
                  );
                  const sidePct = Math.max(0, 100 - allowPct - salPct);

                  return (
                    <button
                      key={snap.monthKey}
                      type="button"
                      onClick={() => setSelectedMonthKey(snap.monthKey)}
                      className={`flex flex-col items-center justify-end h-full rounded-xl p-1.5 transition-all ${
                        isSelected
                          ? 'bg-white/[0.09] ring-1 ring-teal-400/60'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="text-xs font-extrabold tabular-nums text-teal-200 mb-1.5">
                        {privacyMode
                          ? '•••'
                          : `₱${(snap.totalIncome / 1000).toFixed(1)}k`}
                      </span>
                      <div className="w-full flex-1 flex items-end justify-center">
                        <div
                          style={{ height: `${totalH}%` }}
                          className="w-full max-w-[42px] rounded-t-xl overflow-hidden flex flex-col justify-end border border-white/10"
                        >
                          <div
                            style={{ height: `${sidePct}%` }}
                            className="bg-amber-400/85 w-full"
                          />
                          <div
                            style={{ height: `${salPct}%` }}
                            className="bg-indigo-400/85 w-full"
                          />
                          <div
                            style={{ height: `${allowPct}%` }}
                            className="bg-teal-400/85 w-full"
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-100 mt-2">
                        {shortMonth}
                      </span>
                    </button>
                  );
                }

                // chartMode === 'pillars'
                const maxOut = Math.max(
                  ...db.sixMonthHistory.map(
                    (m) => m.totalNeeds + m.totalWants + m.utangPaid
                  ),
                  1
                );
                const sumOut =
                  snap.totalNeeds + snap.totalWants + snap.utangPaid;
                const totalH = Math.max(
                  18,
                  Math.round((sumOut / maxOut) * 100)
                );
                const needsPct = Math.round((snap.totalNeeds / sumOut) * 100);
                const wantsPct = Math.round((snap.totalWants / sumOut) * 100);
                const utangPct = Math.max(0, 100 - needsPct - wantsPct);

                return (
                  <button
                    key={snap.monthKey}
                    type="button"
                    onClick={() => setSelectedMonthKey(snap.monthKey)}
                    className={`flex flex-col items-center justify-end h-full rounded-xl p-1.5 transition-all ${
                      isSelected
                        ? 'bg-white/[0.09] ring-1 ring-indigo-400/60'
                        : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-xs font-extrabold tabular-nums text-indigo-200 mb-1.5">
                      {privacyMode ? '•••' : `₱${(sumOut / 1000).toFixed(1)}k`}
                    </span>
                    <div className="w-full flex-1 flex items-end justify-center">
                      <div
                        style={{ height: `${totalH}%` }}
                        className="w-full max-w-[42px] rounded-t-xl overflow-hidden flex flex-col justify-end border border-white/10"
                      >
                        <div
                          style={{ height: `${utangPct}%` }}
                          className="bg-indigo-400/85 w-full"
                        />
                        <div
                          style={{ height: `${wantsPct}%` }}
                          className="bg-rose-400/85 w-full"
                        />
                        <div
                          style={{ height: `${needsPct}%` }}
                          className="bg-emerald-400/85 w-full"
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-100 mt-2">
                      {shortMonth}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Minimal Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs font-semibold text-slate-400">
              {chartMode === 'kuryente' && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Normal
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    Peak
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Lowest
                  </span>
                </>
              )}
              {chartMode === 'income' && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                    Allowance
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    Salary
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Side Hustle
                  </span>
                </>
              )}
              {chartMode === 'pillars' && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    Needs
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    Wants
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    Utang Paid
                  </span>
                </>
              )}
            </div>
          </GlassCard>

          {/* Right 5 cols: Clean Month Inspector Grid with Big Numbers & 2-Word Labels */}
          {selectedSnapshot && (
            <GlassCard glowColor="teal" className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-300" />
                    <h3 className="text-lg font-bold text-slate-100">
                      {selectedSnapshot.monthLabel}
                    </h3>
                  </div>
                  <GlassBadge tone="teal">Inspector</GlassBadge>
                </div>

                {/* Month Quick Selector Pills */}
                <div className="grid grid-cols-6 gap-1.5 mb-4">
                  {db.sixMonthHistory.map((m) => (
                    <button
                      key={m.monthKey}
                      type="button"
                      onClick={() => setSelectedMonthKey(m.monthKey)}
                      className={`min-h-[38px] rounded-xl text-xs font-bold transition-all ${
                        m.monthKey === selectedSnapshot.monthKey
                          ? 'bg-teal-500/25 text-teal-200 border border-teal-400/40'
                          : 'bg-white/[0.05] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.monthLabel.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {/* 8-Tile 2-Word Label Inspector Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Salary
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-slate-100">
                      {formatPeso(selectedSnapshot.salaryIncome, privacyMode)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Allowance
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-teal-200">
                      {formatPeso(selectedSnapshot.allowanceIncome, privacyMode)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Side Hustle
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-amber-200">
                      {formatPeso(selectedSnapshot.sideHustleIncome, privacyMode)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Groceries
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-slate-100">
                      {formatPeso(
                        selectedSnapshot.groceriesAndFoodNeeds,
                        privacyMode
                      )}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Kuryente
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-amber-300">
                      {formatPeso(selectedSnapshot.kuryenteAmount, privacyMode)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Wants
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-rose-300">
                      {formatPeso(selectedSnapshot.totalWants, privacyMode)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/[0.07]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Utang Paid
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-indigo-300">
                      {formatPeso(selectedSnapshot.utangPaid, privacyMode)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/30">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                      Saved
                    </span>
                    <span className="text-lg font-extrabold tabular-nums text-emerald-200">
                      {formatPeso(selectedSnapshot.netSaved, privacyMode)}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </section>

      {/* ===================================================================
          MODAL: SAVE MONTHLY KURYENTE READING
         =================================================================== */}
      <GlassModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Save Kuryente Reading"
      >
        <form onSubmit={handleSaveReadingSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Billing Month
              </label>
              <input
                type="text"
                required
                value={newBillMonth}
                onChange={(e) => setNewBillMonth(e.target.value)}
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={newBillDueDate}
                onChange={(e) => setNewBillDueDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Billing Period
            </label>
            <input
              type="text"
              required
              value={newBillPeriod}
              onChange={(e) => setNewBillPeriod(e.target.value)}
              className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
            />
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                {kuryenteMetrics.kwhUsed} kWh @ ₱{kuryenteMetrics.ratePerKwh}
              </span>
              <span className="text-2xl font-black tabular-nums text-amber-300">
                {formatPeso(kuryenteMetrics.totalCost, privacyMode)}
              </span>
            </div>
            <GlassBadge tone="amber">
              {calcMode === 'submeter' ? 'Submeter' : 'Direct Bill'}
            </GlassBadge>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Note
            </label>
            <input
              type="text"
              value={newBillNotes}
              onChange={(e) => setNewBillNotes(e.target.value)}
              placeholder="Optional note"
              className="w-full min-h-[44px] rounded-xl glass-input px-3 text-sm text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.08]">
            <GlassButton
              variant="ghost"
              size="md"
              className="min-h-[44px]"
              onClick={() => setIsLogModalOpen(false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              variant="amber"
              size="md"
              className="min-h-[44px]"
              type="submit"
            >
              Save Reading
            </GlassButton>
          </div>
        </form>
      </GlassModal>
    </div>
  );
};
export default KuryenteAndHistoryView;
