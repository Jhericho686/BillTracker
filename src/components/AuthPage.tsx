import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  Home,
  Eye,
  EyeOff,
  Zap,
  Handshake,
  Wallet,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  Palette,
  Loader2,
} from 'lucide-react';
import {
  AuthUser,
  loginAccount,
  registerAccount,
  signUpWithGoogleGmail,
} from '../db/firebase';
import { GlassCard, GlassButton, GlassBadge } from './ui/GlassComponents';

export type ColorTheme = 'aurora' | 'mocha' | 'cyber_sunset' | 'nordic_sky';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
  theme?: ColorTheme;
  onSelectTheme?: (theme: ColorTheme) => void;
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

function evaluatePasswordStrength(pwd: string): {
  score: number;
  label: 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  colorClass: string;
  textClass: string;
} {
  if (!pwd) {
    return { score: 0, label: 'Weak', colorClass: 'bg-rose-400', textClass: 'text-rose-300' };
  }
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) {
    return { score: 1, label: 'Weak', colorClass: 'bg-rose-400', textClass: 'text-rose-300' };
  }
  if (score === 2) {
    return { score: 2, label: 'Fair', colorClass: 'bg-amber-400', textClass: 'text-amber-300' };
  }
  if (score === 3) {
    return { score: 3, label: 'Strong', colorClass: 'bg-teal-400', textClass: 'text-teal-300' };
  }
  return {
    score: 4,
    label: 'Very Strong',
    colorClass: 'bg-emerald-400',
    textClass: 'text-emerald-300',
  };
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onAuthenticated,
  theme = 'aurora',
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
  const [shouldShake, setShouldShake] = useState(false);
  const [gmailNotifiedUser, setGmailNotifiedUser] = useState<AuthUser | null>(null);

  // Task 2: Page Visibility API - pause ambient drift animations when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.classList.add('tab-paused');
      } else {
        document.body.classList.remove('tab-paused');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.classList.remove('tab-paused');
    };
  }, []);

  // Task 4: Trigger ~400ms horizontal card shake when an error occurs
  const triggerErrorWithShake = (msg: string) => {
    setErrorMsg(msg);
    setShouldShake(true);
    setTimeout(() => {
      setShouldShake(false);
    }, 450);
  };

  const handleGoogleGmailAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const { user, isNewUser } = await signUpWithGoogleGmail({
        householdName: householdName.trim() || 'Bahay HQ',
        role,
      });
      if (isNewUser || mode === 'signup') {
        setGmailNotifiedUser(user);
      } else {
        setSuccessMsg(`Welcome back, ${user.name}!`);
        setTimeout(() => {
          onAuthenticated(user);
        }, 350);
      }
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-closed-by-user') {
        triggerErrorWithShake('Google sign-in popup was closed.');
      } else {
        triggerErrorWithShake('Use the Sign Up form above with your @gmail.com address to register.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      triggerErrorWithShake('Please enter a valid Gmail or email address.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      triggerErrorWithShake('Password must be at least 6 characters for security.');
      return;
    }
    if (password.length < 4) {
      triggerErrorWithShake('Password must be at least 4 characters.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      triggerErrorWithShake('Please enter your name or nickname.');
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
        setSuccessMsg(
          `Gmail notification sent to ${user.email}! Welcome to your household ledger.`
        );
        setGmailNotifiedUser(user);
      } else {
        const user = await loginAccount(trimmedEmail, password);
        setSuccessMsg(`Welcome back, ${user.name}! Loading ${user.householdName}...`);
        setTimeout(() => {
          onAuthenticated(user);
        }, 300);
      }
    } catch (err: any) {
      const message =
        err?.message ||
        'Unable to log in. Please check your credentials or create a new account first.';
      triggerErrorWithShake(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col justify-between text-slate-100 relative overflow-hidden bg-[var(--bg-base)]">
      {/* Task 2: Ambient Background - 3 large blurred gradient orbs drifting slowly using theme CSS variables */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
        <div
          className="auth-ambient-orb-1 absolute w-[520px] h-[520px] rounded-full blur-[110px] -top-32 -left-28 opacity-40 pointer-events-none"
          style={{ background: 'var(--orb-1)' }}
        />
        <div
          className="auth-ambient-orb-2 absolute w-[580px] h-[580px] rounded-full blur-[130px] top-1/4 -right-36 opacity-35 pointer-events-none"
          style={{ background: 'var(--orb-2)' }}
        />
        <div
          className="auth-ambient-orb-3 absolute w-[460px] h-[460px] rounded-full blur-[120px] -bottom-24 left-1/3 opacity-30 pointer-events-none"
          style={{ background: 'var(--orb-3)' }}
        />
      </div>

      {/* Top Glass Header with Brand & Theme Switcher (Task 5: Cross-fade via CSS variables) */}
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

          {/* Task 5: Color Theme Selector (Aurora, Warm Mocha, Berry Sunset, Nordic Sky) */}
          {onSelectTheme && (
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
          )}
        </div>
      </header>

      {/* Main Split-Screen Content (Task 6: Mobile-first responsive grid) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Hero Headline & Feature Cards (Task 1: Staggered Entrance 0-400ms) */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left order-1">
            <div className="space-y-3">
              {/* Task 6: Fixed line breaks so "Every Peso," does not sit alone awkwardly */}
              <h1 className="auth-enter-stagger auth-stagger-0 text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.18]">
                Every Peso, Kuryente Bill &amp; Utang in Sync.
              </h1>
              {/* Task 1: Stagger 1 (80ms) */}
              <p className="auth-enter-stagger auth-stagger-1 text-xs sm:text-sm lg:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Sign in to sync your household wallets, grocery stock, Meralco kWh history, and
                repayment schedules across your phone and PC.
              </p>
            </div>

            {/* Task 3: 4 Feature Cards (lift 3px, soft border glow in theme accent, icon tilts, 200ms) */}
            {/* Task 1: Stagger 2, 3, 4, 5 (160ms, 240ms, 320ms, 400ms) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto lg:mx-0">
              <div className="auth-enter-stagger auth-stagger-2 auth-feature-card glass-panel rounded-2xl border border-white/[0.12] p-3.5 flex items-center gap-3 text-left cursor-default">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/35 flex items-center justify-center text-violet-200 shrink-0 auth-feature-icon">
                  <Wallet className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">4 Bahay Wallets</p>
                  <p className="text-[11px] text-slate-300">Cash, GCash, Maya, Bank</p>
                </div>
              </div>

              <div className="auth-enter-stagger auth-stagger-3 auth-feature-card glass-panel rounded-2xl border border-white/[0.12] p-3.5 flex items-center gap-3 text-left cursor-default">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center text-amber-200 shrink-0 auth-feature-icon">
                  <Zap className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Kuryente &amp; 6-Mo</p>
                  <p className="text-[11px] text-slate-300">kWh &amp; Bill Analytics</p>
                </div>
              </div>

              <div className="auth-enter-stagger auth-stagger-4 auth-feature-card glass-panel rounded-2xl border border-white/[0.12] p-3.5 flex items-center gap-3 text-left cursor-default">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/35 flex items-center justify-center text-rose-200 shrink-0 auth-feature-icon">
                  <Handshake className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Utang Hub</p>
                  <p className="text-[11px] text-slate-300">Payables &amp; Receivables</p>
                </div>
              </div>

              <div className="auth-enter-stagger auth-stagger-5 auth-feature-card glass-panel rounded-2xl border border-white/[0.12] p-3.5 flex items-center gap-3 text-left cursor-default">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/35 flex items-center justify-center text-fuchsia-200 shrink-0 auth-feature-icon">
                  <Users className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Audit Trail</p>
                  <p className="text-[11px] text-slate-300">Every Action Logged</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Glassmorphism Login / Sign Up Card (Task 1: Stagger 6 @ 480ms, Task 4: Error Shake) */}
          <div className="lg:col-span-6 order-2">
            <div
              className={`auth-enter-stagger auth-stagger-6 glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/[0.16] ${
                shouldShake ? 'auth-shake-error' : ''
              }`}
            >
              {/* Task 4: Segmented Tab Switcher with Smooth Sliding Highlight */}
              <div
                role="tablist"
                aria-label="Authentication Mode"
                className="relative grid grid-cols-2 p-1.5 rounded-2xl bg-black/40 border border-white/[0.10] mb-6 overflow-hidden"
              >
                {/* Sliding active highlight background */}
                <div
                  aria-hidden="true"
                  className={`auth-tab-highlight absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl bg-gradient-to-r from-violet-500/80 via-fuchsia-500/75 to-rose-500/80 border border-fuchsia-300/40 shadow-lg ${
                    mode === 'signup' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-1.5'
                  }`}
                />

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'login'}
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`relative z-10 min-h-[44px] rounded-xl text-sm font-extrabold transition-colors cursor-pointer ${
                    mode === 'login' ? 'text-white' : 'text-slate-300 hover:text-white'
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
                  className={`relative z-10 min-h-[44px] rounded-xl text-sm font-extrabold transition-colors cursor-pointer ${
                    mode === 'signup' ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Task 4: Smooth Form Content Cross-fade Container */}
              <div key={mode} className="auth-form-crossfade">
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

                {/* Feedback Banners (Task 4: Clear inline error message) */}
                {errorMsg && (
                  <div
                    role="alert"
                    className="mb-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-400/45 text-rose-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" aria-hidden="true" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div
                    role="status"
                    className="mb-4 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/45 text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-fadeIn"
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
                          {/* Task 4: Input Focus Glowing Border & Brightening Icon */}
                          <div className="auth-input-group">
                            <User
                              className="auth-input-icon w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              aria-hidden="true"
                            />
                            <input
                              id="auth-name"
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="e.g. Jhericho"
                              className="auth-input-field w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-sm"
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
                          <div className="auth-input-group">
                            <Home
                              className="auth-input-icon w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                              aria-hidden="true"
                            />
                            <input
                              id="auth-household"
                              type="text"
                              required
                              value={householdName}
                              onChange={(e) => setHouseholdName(e.target.value)}
                              placeholder="e.g. Bahay HQ"
                              className="auth-input-field w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-sm"
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

                  {/* Email Input (Task 4: Glowing border & icon brighten) */}
                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5"
                    >
                      Email Address
                    </label>
                    <div className="auth-input-group">
                      <Mail
                        className="auth-input-icon w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
                        className="auth-input-field w-full glass-input rounded-xl pl-10 pr-3.5 py-2.5 text-sm"
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
                    <div className="auth-input-group">
                      <Lock
                        className="auth-input-icon w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
                        className="auth-input-field w-full glass-input rounded-xl pl-10 pr-12 py-2.5 text-sm"
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

                    {/* Real-time 4-Bar Password Strength Meter on Sign Up */}
                    {mode === 'signup' && password.length > 0 && (() => {
                      const strength = evaluatePasswordStrength(password);
                      return (
                        <div className="mt-2 space-y-1">
                          <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4].map((bar) => (
                              <div
                                key={bar}
                                className={`h-1.5 rounded-full transition-all ${
                                  bar <= strength.score ? strength.colorClass : 'bg-white/[0.12]'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Password strength</span>
                            <span className={`font-extrabold ${strength.textClass}`}>
                              {strength.label}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
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

                  {/* Task 4: Submit CTA with Shine Sweep, scale(0.98) press & inline Loading Spinner */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="auth-submit-btn w-full min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-rose-500 text-white font-extrabold tracking-wide text-sm flex items-center justify-center gap-2.5 shadow-lg border border-white/20 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" aria-hidden="true" />
                        <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'login' ? 'Log In to Bahay' : 'Sign Up & Notify My Gmail'}</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>

                {/* Task 6: Google 1-Click with Official Google "G" Multi-color Logo & Higher Contrast Fill */}
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleGoogleGmailAuth}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-white/[0.09] hover:bg-white/[0.16] border border-white/[0.24] text-xs font-bold text-white flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98] shadow-sm"
                  >
                    {/* Official Multi-Color Google G SVG */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>
                      {mode === 'signup'
                        ? 'Sign Up with Google (Gmail)'
                        : 'Continue with Google (Gmail)'}
                    </span>
                  </button>
                </div>

                {/* Task 6: Increased size/weight for "Sign Up first to access BillsTracker" link */}
                <div className="mt-5 pt-4 border-t border-white/[0.10] text-center">
                  {mode === 'login' ? (
                    <p className="text-xs sm:text-sm text-slate-300">
                      Don&apos;t have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="font-black text-sm text-teal-300 hover:text-teal-200 underline underline-offset-4 cursor-pointer hover:brightness-110 transition-all inline-block mt-0.5"
                      >
                        Sign Up first to access BillsTracker
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-300">
                      Already registered an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                        }}
                        className="font-black text-sm text-teal-300 hover:text-teal-200 underline underline-offset-4 cursor-pointer hover:brightness-110 transition-all inline-block mt-0.5"
                      >
                        Log In here
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Gmail Thank You Notification Modal on Sign Up */}
      {gmailNotifiedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Gmail Notification Sent"
        >
          <GlassCard
            glowColor="teal"
            className="max-w-lg w-full p-6 sm:p-8 border border-teal-400/45 shadow-2xl space-y-5"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/30 via-amber-500/25 to-teal-500/30 border border-teal-400/45 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-teal-300" aria-hidden="true" />
              </div>
              <div>
                <GlassBadge tone="emerald">Gmail Notification Dispatched</GlassBadge>
                <h3 className="text-xl font-black text-white mt-1">
                  Thank You for Using Bills<span className="text-amber-400">Tracker</span>!
                </h3>
              </div>
            </div>

            {/* Simulated / Dispatched Gmail Message Preview */}
            <div className="glass-pill p-4 rounded-2xl border border-white/[0.14] space-y-2.5 text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-300 border-b border-white/[0.08] pb-2">
                <span>
                  <strong className="text-white">To:</strong> {gmailNotifiedUser.email}
                </span>
                <span className="text-emerald-300 font-bold">✔ Sent via BillsTracker Cloud</span>
              </div>
              <p className="text-xs font-extrabold text-amber-300">
                Subject: Thank You for Using BillsTracker, {gmailNotifiedUser.name}! 🏠✨
              </p>
              <p className="text-xs text-slate-200 leading-relaxed">
                Hi <strong>{gmailNotifiedUser.name}</strong>, thank you so much for signing up with your
                Gmail (<strong>{gmailNotifiedUser.email}</strong>)! Your household command center for{' '}
                <strong>{gmailNotifiedUser.householdName}</strong> ({gmailNotifiedUser.role}) is now
                active and synced.
              </p>
              <p className="text-[11px] text-slate-400">
                A verification &amp; welcome notification has also been queued to your Gmail inbox.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl glass-pill border border-white/[0.16] text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all"
              >
                <Mail className="w-4 h-4 text-rose-300" aria-hidden="true" />
                <span>Check My Gmail Inbox</span>
              </a>
              <GlassButton
                type="button"
                variant="primary"
                size="lg"
                onClick={() => onAuthenticated(gmailNotifiedUser)}
                className="flex-1 font-extrabold"
              >
                <span>Enter BillsTracker Dashboard</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Subtle Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-400">
        <span>BillsTracker • Eye-Friendly Glassmorphism Edition</span>
      </footer>
    </div>
  );
};
