import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Home,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Zap,
  Handshake,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Palette,
  Users,
} from 'lucide-react';
import {
  AuthUser,
  loginAccount,
  registerAccount,
} from '../db/firebase';
import { GlassCard, GlassButton, GlassBadge } from './ui/GlassComponents';

export type ColorTheme = 'aurora' | 'mocha' | 'cyber_sunset' | 'nordic_sky';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
  theme: ColorTheme;
  onSelectTheme: (theme: ColorTheme) => void;
}

const COLOR_THEMES: { id: ColorTheme; label: string; dotClass: string }[] = [
  { id: 'aurora', label: 'Aurora Violet', dotClass: 'from-violet-400 via-fuchsia-400 to-rose-400' },
  { id: 'mocha', label: 'Warm Mocha', dotClass: 'from-amber-400 via-orange-400 to-yellow-300' },
  { id: 'cyber_sunset', label: 'Berry Sunset', dotClass: 'from-rose-400 via-pink-500 to-orange-400' },
  { id: 'nordic_sky', label: 'Nordic Sky', dotClass: 'from-indigo-400 via-sky-400 to-purple-400' },
];

const MEMBER_ROLES = [
  'Head of House',
  'Partner / Spouse',
  'Family Member',
];

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthenticated,
  theme,
  onSelectTheme,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [householdName, setHouseholdName] = useState('Bahay HQ');
  const [role, setRole] = useState('Head of House');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setErrorMsg('Please enter your name or nickname.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const user = await registerAccount({
          name: name.trim(),
          email: trimmedEmail,
          password,
          householdName: householdName.trim() || 'Bahay HQ',
          role,
        });
        setSuccessMsg(`Welcome to ${user.householdName}, ${user.name}!`);
        setTimeout(() => {
          onAuthenticated(user);
        }, 450);
      } else {
        const user = await loginAccount(trimmedEmail, password);
        setSuccessMsg(`Welcome back, ${user.name}!`);
        setTimeout(() => {
          onAuthenticated(user);
        }, 350);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh text-slate-100 relative overflow-x-hidden flex flex-col justify-between">
      {/* Ambient Eye-Friendly Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div className="ambient-blob w-[460px] h-[460px] bg-fuchsia-500/15 -top-24 -left-24" />
        <div className="ambient-blob w-[520px] h-[520px] bg-violet-500/15 top-1/3 -right-32" />
        <div className="ambient-blob w-[400px] h-[400px] bg-rose-500/15 bottom-0 left-1/4" />
      </div>

      {/* Top Glass Header with Brand & Live Theme Switcher */}
      <header className="relative z-20 glass-panel border-b border-white/[0.08] px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/[0.16] p-1.5 flex items-center justify-center shadow-lg">
              <img
                src="./logo.png"
                alt="BillsTracker Logo"
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">
                  Bills<span className="text-amber-400">Tracker</span>
                </span>
                <GlassBadge tone="teal">Cloud Sync</GlassBadge>
              </div>
              <p className="text-[11px] text-slate-300 font-medium hidden sm:block">
                Smart Bahay Allowance, Kuryente & Utang Command Center
              </p>
            </div>
          </div>

          {/* Live Eye-Friendly Theme Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-black/25 p-1 rounded-2xl border border-white/[0.10]">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-300 px-2">
              <Palette className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
              Theme
            </span>
            {COLOR_THEMES.map((t) => {
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTheme(t.id)}
                  aria-label={`Switch to ${t.label} theme`}
                  title={t.label}
                  className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/[0.18] text-white border border-white/[0.32] shadow'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.07]'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${t.dotClass} shrink-0`}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">{t.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Split-Screen Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Scannable Value Showcase */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill border border-teal-400/35 text-xs font-bold text-teal-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Bahay Financial Peace of Mind</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.12]">
                Every Peso,{' '}
                <span className="bg-gradient-to-r from-violet-300 via-rose-300 to-amber-300 bg-clip-text text-transparent">
                  Kuryente Bill
                </span>{' '}
                &amp; Utang in Sync.
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Sign in to sync your household wallets, grocery stock, Meralco kWh history, and
                repayment schedules across your phone and PC.
              </p>
            </div>

            {/* 4 Scannable Feature Pills (UI/UX Pro Max: Short 1-3 Word Labels) */}
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto lg:mx-0">
              <GlassCard glowColor="teal" className="p-3.5 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/35 flex items-center justify-center text-violet-200 shrink-0">
                  <Wallet className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">4 Bahay Wallets</p>
                  <p className="text-[11px] text-slate-300">Cash, GCash, Maya, Bank</p>
                </div>
              </GlassCard>

              <GlassCard glowColor="amber" className="p-3.5 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center text-amber-200 shrink-0">
                  <Zap className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Kuryente &amp; 6-Mo</p>
                  <p className="text-[11px] text-slate-300">kWh &amp; Bill Analytics</p>
                </div>
              </GlassCard>

              <GlassCard glowColor="rose" className="p-3.5 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/35 flex items-center justify-center text-rose-200 shrink-0">
                  <Handshake className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Utang Hub</p>
                  <p className="text-[11px] text-slate-300">Payables &amp; Receivables</p>
                </div>
              </GlassCard>

              <GlassCard glowColor="emerald" className="p-3.5 flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/35 flex items-center justify-center text-fuchsia-200 shrink-0">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Audit Trail</p>
                  <p className="text-[11px] text-slate-300">Every Action Logged</p>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Right Column: Glassmorphism Login / Sign Up Card */}
          <div className="lg:col-span-6">
            <GlassCard glowColor="teal" className="p-6 sm:p-8 shadow-2xl border border-white/[0.16]">
              {/* Segmented Tab Switcher: Log In | Sign Up */}
              <div
                role="tablist"
                aria-label="Authentication Mode"
                className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-black/35 border border-white/[0.10] mb-6"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`min-h-[44px] rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-violet-500/80 via-fuchsia-500/75 to-rose-500/80 text-white border border-fuchsia-300/45 shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signup'}
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`min-h-[44px] rounded-xl text-sm font-extrabold transition-all cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-violet-500/80 via-fuchsia-500/75 to-rose-500/80 text-white border border-fuchsia-300/45 shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Card Header */}
              <div className="mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {mode === 'login' ? 'Welcome Back to Bahay' : 'Create Household Account'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {mode === 'login'
                    ? 'Enter your email and password to load your household ledger.'
                    : 'Set up your household profile in seconds.'}
                </p>
              </div>

              {/* Feedback Banners */}
              {errorMsg && (
                <div
                  role="alert"
                  className="mb-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-400/45 text-rose-200 text-xs font-bold flex items-center gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div
                  role="status"
                  className="mb-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/45 text-emerald-200 text-xs font-bold flex items-center gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" aria-hidden="true" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label
                          htmlFor="auth-name"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                        >
                          Your Name
                        </label>
                        <div className="relative">
                          <User
                            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            aria-hidden="true"
                          />
                          <input
                            id="auth-name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Jhericho"
                            className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="auth-household"
                          className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                        >
                          Household Name
                        </label>
                        <div className="relative">
                          <Home
                            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            aria-hidden="true"
                          />
                          <input
                            id="auth-household"
                            type="text"
                            required
                            value={householdName}
                            onChange={(e) => setHouseholdName(e.target.value)}
                            placeholder="e.g. Bahay HQ"
                            className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Member Role Selector */}
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
                        Household Role
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {MEMBER_ROLES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              role === r
                                ? 'bg-teal-500/30 text-teal-200 border border-teal-400/50 shadow'
                                : 'glass-pill text-slate-300 hover:text-white'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Email Input */}
                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>

                {/* Password Input with Show/Hide Toggle */}
                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full glass-input rounded-xl pl-10 pr-12 py-2.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="w-11 h-11 absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-300 hover:text-white rounded-lg cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-amber-300" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Row */}
                <div className="flex items-center justify-between pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded accent-fuchsia-500 cursor-pointer"
                    />
                    <span>Keep me signed in on this device</span>
                  </label>
                </div>

                {/* Submit CTA */}
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isLoading}
                  className="w-full font-extrabold tracking-wide mt-2"
                >
                  <span>
                    {isLoading
                      ? mode === 'login'
                        ? 'Signing In...'
                        : 'Creating Account...'
                      : mode === 'login'
                      ? 'Log In to Bahay'
                      : 'Create Household Account'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </GlassButton>
              </form>

              {/* Strict Account Requirement Notice & Mode Toggle Link */}
              <div className="mt-5 pt-4 border-t border-white/[0.10] text-center">
                {mode === 'login' ? (
                  <p className="text-xs text-slate-300">
                    Don&apos;t have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="font-extrabold text-teal-300 hover:text-teal-200 underline underline-offset-4 cursor-pointer"
                    >
                      Sign Up first to access BillsTracker
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-300">
                    Already registered an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="font-extrabold text-teal-300 hover:text-teal-200 underline underline-offset-4 cursor-pointer"
                    >
                      Log In here
                    </button>
                  </p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-400">
        <span>BillsTracker • Eye-Friendly Glassmorphism Edition</span>
      </footer>
    </div>
  );
};
