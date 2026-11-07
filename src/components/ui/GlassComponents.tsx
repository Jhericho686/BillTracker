import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type GlowTone = 'emerald' | 'teal' | 'amber' | 'rose' | 'indigo' | 'none';
export type BadgeTone = 'emerald' | 'teal' | 'amber' | 'rose' | 'indigo' | 'slate';
export type ProgressTone = 'emerald' | 'teal' | 'amber' | 'rose' | 'indigo';

/**
 * Formats an amount in Philippine Peso (₱) with optional privacy masking.
 */
export function formatPeso(amount: number, privacyMode?: boolean): string {
  if (privacyMode) {
    return '₱ •••••';
  }
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const isNegative = safeAmount < 0;
  const formatted = Math.abs(Math.round(safeAmount)).toLocaleString('en-PH');
  return isNegative ? `-₱${formatted}` : `₱${formatted}`;
}

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: GlowTone;
  onClick?: () => void;
}

const glowStyles: Record<GlowTone, string> = {
  none: '',
  emerald:
    'border-fuchsia-400/25 shadow-[0_8px_32px_-6px_rgba(217,70,239,0.18)] hover:border-fuchsia-400/40',
  teal:
    'border-violet-400/25 shadow-[0_8px_32px_-6px_rgba(168,85,247,0.18)] hover:border-violet-400/40',
  amber:
    'border-amber-400/25 shadow-[0_8px_32px_-6px_rgba(245,158,11,0.18)] hover:border-amber-400/40',
  rose:
    'border-rose-400/25 shadow-[0_8px_32px_-6px_rgba(244,63,94,0.18)] hover:border-rose-400/40',
  indigo:
    'border-indigo-400/25 shadow-[0_8px_32px_-6px_rgba(99,102,241,0.18)] hover:border-indigo-400/40',
};

const topHighlightStyles: Record<GlowTone, string> = {
  none: 'from-white/20 via-rose-200/10 to-transparent',
  emerald: 'from-rose-300/45 via-fuchsia-400/20 to-transparent',
  teal: 'from-violet-300/45 via-fuchsia-400/20 to-transparent',
  amber: 'from-amber-300/45 via-orange-400/20 to-transparent',
  rose: 'from-rose-300/45 via-pink-400/20 to-transparent',
  indigo: 'from-indigo-300/45 via-violet-400/20 to-transparent',
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'none',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative overflow-hidden rounded-2xl glass-card ${glowStyles[glowColor]} ${
        onClick
          ? 'cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400'
          : ''
      } ${className}`}
    >
      {/* Subtle refractive top edge highlight */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${topHighlightStyles[glowColor]}`}
      />
      {children}
    </div>
  );
};

export interface GlassButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

const buttonVariants: Record<NonNullable<GlassButtonProps['variant']>, string> = {
  primary:
    'bg-gradient-to-r from-violet-500/85 via-fuchsia-500/80 to-rose-500/85 hover:from-violet-400/95 hover:via-fuchsia-400/90 hover:to-rose-400/95 text-white font-semibold border border-fuchsia-300/45 shadow-[0_4px_22px_-2px_rgba(217,70,239,0.4)]',
  secondary:
    'bg-white/[0.08] hover:bg-white/[0.15] text-slate-100 font-medium border border-violet-300/25 backdrop-blur-md shadow-sm',
  amber:
    'bg-gradient-to-r from-amber-500/85 to-orange-500/80 hover:from-amber-400/95 hover:to-orange-400/90 text-slate-950 font-semibold border border-amber-300/45 shadow-[0_4px_20px_-2px_rgba(245,158,11,0.35)]',
  danger:
    'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium border border-rose-400/35 backdrop-blur-md',
  ghost:
    'bg-transparent hover:bg-white/[0.08] text-slate-300 hover:text-white border border-transparent hover:border-white/[0.10]',
};

const buttonSizes: Record<NonNullable<GlassButtonProps['size']>, string> = {
  sm: 'min-h-[38px] px-3.5 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'min-h-[44px] px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-5 py-3 text-base rounded-2xl gap-2.5',
};

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  title,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center cursor-pointer transition-all duration-200 select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-45 disabled:pointer-events-none ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};

export interface GlassBadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const badgeTones: Record<BadgeTone, string> = {
  emerald: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/35',
  teal: 'bg-violet-500/20 text-violet-200 border-violet-400/35',
  amber: 'bg-amber-500/20 text-amber-200 border-amber-400/35',
  rose: 'bg-rose-500/20 text-rose-200 border-rose-400/35',
  indigo: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/35',
  slate: 'bg-white/[0.08] text-slate-200 border-white/[0.16]',
};

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  tone = 'slate',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border backdrop-blur-md tabular-nums ${badgeTones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export interface GlassProgressBarProps {
  value: number;
  max: number;
  tone?: ProgressTone;
  labelLeft?: string;
  labelRight?: string;
  height?: 'sm' | 'md' | 'lg';
}

const progressFills: Record<ProgressTone, string> = {
  emerald:
    'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-400 shadow-[0_0_14px_rgba(217,70,239,0.5)]',
  teal:
    'bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-400 shadow-[0_0_14px_rgba(168,85,247,0.5)]',
  amber:
    'bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 shadow-[0_0_14px_rgba(245,158,11,0.5)]',
  rose:
    'bg-gradient-to-r from-rose-500 via-pink-500 to-orange-400 shadow-[0_0_14px_rgba(244,63,94,0.5)]',
  indigo:
    'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-400 shadow-[0_0_14px_rgba(99,102,241,0.5)]',
};

const progressHeights: Record<NonNullable<GlassProgressBarProps['height']>, string> = {
  sm: 'h-2.5',
  md: 'h-3',
  lg: 'h-3.5',
};

export const GlassProgressBar: React.FC<GlassProgressBarProps> = ({
  value,
  max,
  tone = 'teal',
  labelLeft,
  labelRight,
  height = 'md',
}) => {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className="w-full space-y-1.5">
      {(labelLeft || labelRight) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          {labelLeft ? (
            <span className="font-semibold text-slate-200 truncate">{labelLeft}</span>
          ) : (
            <span />
          )}
          {labelRight ? (
            <span className="text-slate-100 font-bold tabular-nums shrink-0">{labelRight}</span>
          ) : null}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full ${progressHeights[height]} rounded-full bg-black/40 border border-white/[0.14] overflow-hidden p-[1px]`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${progressFills[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Low-glare frosted backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        aria-hidden="true"
      />
      {/* Modal container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full ${maxWidth} rounded-3xl glass-panel border border-white/[0.16] p-5 sm:p-7 text-slate-100 shadow-2xl my-8 overflow-hidden`}
      >
        {/* Subtle ambient top sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/50 to-transparent"
        />

        <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-white/[0.10]">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.07] hover:bg-white/[0.15] border border-white/[0.14] text-slate-200 hover:text-white cursor-pointer active:scale-[0.95] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
};

export interface GlassSectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const GlassSectionHeader: React.FC<GlassSectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2.5 rounded-2xl bg-violet-500/20 border border-violet-400/35 text-violet-200 shadow-inner shrink-0">
            {icon}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <span className="text-xs font-medium text-slate-300 bg-white/[0.07] border border-white/[0.12] px-2 py-0.5 rounded-full">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};
