import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Download,
  FileJson,
  Plus,
  Clock,
  ArrowRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Zap,
  Users,
  Database,
  FileText,
  Trash2,
  CheckCircle2,
  Activity,
  Tag,
  X,
} from 'lucide-react';
import { AuditLogEntry, AuditActionType, AuditModule } from '../types/database';
import {
  exportAuditLogsCSV,
  exportAuditLogsJSON,
  getAuditStats,
} from '../services/auditLogger';

interface AuditLogsViewProps {
  logs: AuditLogEntry[];
  privacyMode: boolean;
  onClearTestLogs?: () => void;
  onDeleteAuditLog?: (id: string) => void;
  onLogManualAuditNote: (summary: string, module: AuditModule) => void;
}

const PILL_MODULES: ('ALL' | AuditModule)[] = [
  'ALL',
  'WALLET',
  'INCOME',
  'EXPENSE',
  'GROCERY',
  'KURYENTE',
  'UTANG',
];

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  logs,
  privacyMode,
  onClearTestLogs,
  onDeleteAuditLog,
  onLogManualAuditNote,
}) => {
  const [selectedModule, setSelectedModule] = useState<'ALL' | AuditModule>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  const [manualNoteText, setManualNoteText] = useState('');
  const [manualNoteModule, setManualNoteModule] = useState<AuditModule>('SYSTEM');
  const [noteSubmittedFeedback, setNoteSubmittedFeedback] = useState(false);

  const stats = useMemo(() => getAuditStats(logs), [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedModule !== 'ALL' && log.module !== selectedModule) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          log.summary?.toLowerCase().includes(q) ||
          log.actor?.toLowerCase().includes(q) ||
          log.id?.toLowerCase().includes(q) ||
          log.walletAffected?.toLowerCase().includes(q) ||
          log.previousValue?.toLowerCase().includes(q) ||
          log.newValue?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, selectedModule, searchQuery]);

  const formatPeso = (amount: number, decimals = 0) => {
    if (privacyMode) return '₱••••';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Math.abs(amount));
  };

  const formatShortTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getModuleBadgeStyle = (module: AuditModule) => {
    switch (module) {
      case 'WALLET':
        return {
          classes: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          icon: <Wallet className="w-3.5 h-3.5" />,
        };
      case 'INCOME':
        return {
          classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          icon: <TrendingUp className="w-3.5 h-3.5" />,
        };
      case 'EXPENSE':
        return {
          classes: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          icon: <TrendingDown className="w-3.5 h-3.5" />,
        };
      case 'GROCERY':
        return {
          classes: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
          icon: <ShoppingCart className="w-3.5 h-3.5" />,
        };
      case 'KURYENTE':
        return {
          classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          icon: <Zap className="w-3.5 h-3.5" />,
        };
      case 'UTANG':
        return {
          classes: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          icon: <Users className="w-3.5 h-3.5" />,
        };
      case 'BUDGET':
        return {
          classes: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          icon: <Activity className="w-3.5 h-3.5" />,
        };
      case 'SYSTEM':
      default:
        return {
          classes: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
          icon: <Database className="w-3.5 h-3.5" />,
        };
    }
  };

  const getActionBadgeClasses = (action: AuditActionType) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'UPDATE':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'DELETE':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'PAYMENT':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'CHECKOUT':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      case 'BILL_PAID':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'WALLET_TRANSFER':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualNoteText.trim();
    if (!trimmed) return;
    onLogManualAuditNote(trimmed, manualNoteModule);
    setManualNoteText('');
    setNoteSubmittedFeedback(true);
    setTimeout(() => {
      setNoteSubmittedFeedback(false);
      setShowNoteDrawer(false);
    }, 1200);
  };

  return (
    <div className="space-y-5">
      {/* Top 4 Big-Number Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. TOTAL EVENTS */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps">TOTAL EVENTS</span>
            <FileText className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-slate-100 leading-none">
              {logs.length}
            </p>
            <span className="inline-block mt-1.5 text-[11px] font-semibold text-teal-400 tabular-nums">
              +{stats.todayActivityCount} TODAY
            </span>
          </div>
        </div>

        {/* 2. VOLUME TRACKED */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps">VOLUME TRACKED</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-emerald-300 leading-none truncate">
              {formatPeso(stats.totalVolumeTracked, 0)}
            </p>
            <span className="inline-block mt-1.5 text-[11px] font-semibold text-emerald-400/80 uppercase">
              VERIFIED LEDGER
            </span>
          </div>
        </div>

        {/* 3. MUTATIONS */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps">MUTATIONS</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-amber-300 leading-none">
              {stats.financialMutationsCount}
            </p>
            <span className="inline-block mt-1.5 text-[11px] font-semibold text-slate-400 uppercase">
              STATE SNAPSHOTS
            </span>
          </div>
        </div>

        {/* 4. MODULES */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="label-caps">MODULES</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-indigo-300 leading-none">
              {stats.activeModulesCount} <span className="text-xl text-slate-500">/ 8</span>
            </p>
            <span className="inline-block mt-1.5 text-[11px] font-semibold text-indigo-400/80 uppercase">
              100% SYNCED
            </span>
          </div>
        </div>
      </div>

      {/* Streamlined Filter & Export Bar */}
      <div className="glass-panel rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Short Module Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
            {PILL_MODULES.map((mod) => {
              const active = selectedModule === mod;
              const count =
                mod === 'ALL' ? logs.length : stats.moduleBreakdown[mod] || 0;
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModule(mod)}
                  className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold tracking-wide whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    active
                      ? 'bg-teal-500/25 text-teal-200 border-teal-400/50 shadow-sm'
                      : 'bg-white/[0.04] text-slate-400 border-white/[0.08] hover:text-slate-200 hover:bg-white/[0.08]'
                  }`}
                >
                  <span>{mod}</span>
                  <span className="text-[11px] opacity-75 tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search & 1-Tap Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="glass-input w-full min-h-[44px] rounded-xl pl-9 pr-8 text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowNoteDrawer((prev) => !prev)}
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-bold tracking-wide transition-all inline-flex items-center gap-1.5 border ${
                showNoteDrawer
                  ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>+ Note</span>
            </button>

            {onClearTestLogs && (
              <button
                type="button"
                onClick={onClearTestLogs}
                className="min-h-[44px] px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-bold transition-all inline-flex items-center justify-center"
                title="Clear Logs"
                aria-label="Clear Logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Quick Note Bar */}
        {showNoteDrawer && (
          <form
            onSubmit={handleAddNoteSubmit}
            className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <select
              value={manualNoteModule}
              onChange={(e) => setManualNoteModule(e.target.value as AuditModule)}
              className="glass-input min-h-[44px] rounded-xl px-3 text-xs font-semibold text-slate-200 sm:w-40"
            >
              <option value="SYSTEM" className="bg-slate-900">SYSTEM</option>
              <option value="WALLET" className="bg-slate-900">WALLET</option>
              <option value="INCOME" className="bg-slate-900">INCOME</option>
              <option value="EXPENSE" className="bg-slate-900">EXPENSE</option>
              <option value="GROCERY" className="bg-slate-900">GROCERY</option>
              <option value="KURYENTE" className="bg-slate-900">KURYENTE</option>
              <option value="UTANG" className="bg-slate-900">UTANG</option>
              <option value="BUDGET" className="bg-slate-900">BUDGET</option>
            </select>

            <input
              type="text"
              value={manualNoteText}
              onChange={(e) => setManualNoteText(e.target.value)}
              placeholder="Audit note (e.g. Cash vault verified ₱5,000)..."
              className="glass-input flex-1 min-h-[44px] rounded-xl px-3.5 text-xs sm:text-sm"
              autoFocus
            />

            <button
              type="submit"
              disabled={!manualNoteText.trim()}
              className="min-h-[44px] px-4 rounded-xl bg-teal-500/25 hover:bg-teal-500/35 disabled:opacity-40 text-teal-200 border border-teal-400/40 text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center justify-center gap-1.5"
            >
              {noteSubmittedFeedback ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>SAVED</span>
                </>
              ) : (
                <span>SAVE NOTE</span>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Scannable Event Rows */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="label-caps">EVENT STREAM</span>
          <span className="text-xs font-bold tabular-nums text-slate-400">
            {filteredLogs.length} / {logs.length}
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 bg-white/[0.02] border border-dashed border-white/[0.1] rounded-2xl">
            <ShieldCheck className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300 uppercase tracking-wide">
              NO EVENTS FOUND
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredLogs.map((log) => {
              const moduleStyle = getModuleBadgeStyle(log.module);
              const actionClasses = getActionBadgeClasses(log.action);
              const hasDiff = Boolean(log.previousValue || log.newValue);
              const hasDelta =
                typeof log.amountDelta === 'number' &&
                !Number.isNaN(log.amountDelta) &&
                log.amountDelta !== 0;

              return (
                <div
                  key={log.id}
                  className="glass-card rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left: Module badge + Action badge + Short Summary + Before -> After pill */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${moduleStyle.classes}`}
                      >
                        {moduleStyle.icon}
                        {log.module}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ${actionClasses}`}
                      >
                        <Tag className="w-3 h-3" />
                        {log.action}
                      </span>

                      {hasDiff && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-950/70 border border-white/[0.1] text-[11px] tabular-nums">
                          <span className="font-mono text-amber-300 truncate max-w-[120px]">
                            {privacyMode ? '•••' : log.previousValue || '—'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono text-emerald-300 truncate max-w-[120px]">
                            {privacyMode ? '•••' : log.newValue || '—'}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {log.summary}
                    </p>
                  </div>

                  {/* Right: HUGE Peso Delta + short time/wallet tag */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.08]">
                    {hasDelta ? (
                      <span
                        className={`text-xl sm:text-2xl font-black tabular-nums leading-none tracking-tight ${
                          log.amountDelta! > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {log.amountDelta! > 0 ? '+' : '-'}
                        {formatPeso(log.amountDelta!, 0)}
                      </span>
                    ) : (
                      <span className="text-sm font-bold tabular-nums text-slate-500">
                        —
                      </span>
                    )}

                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 tabular-nums">
                      {log.walletAffected && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-semibold">
                          <Wallet className="w-3 h-3 text-indigo-400" />
                          {log.walletAffected}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {formatShortTime(log.timestamp)}
                      </span>
                      {onDeleteAuditLog && (
                        <button
                          type="button"
                          onClick={() => onDeleteAuditLog(log.id)}
                          aria-label={`Delete audit log ${log.id}`}
                          title="Delete Log Entry"
                          className="ml-1 min-w-[38px] min-h-[38px] rounded-xl bg-rose-500/10 hover:bg-rose-500/25 border border-rose-400/25 text-rose-300 inline-flex items-center justify-center transition active:scale-[0.96] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsView;
