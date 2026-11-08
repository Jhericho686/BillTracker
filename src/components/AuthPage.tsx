import React, { useState, useEffect, useRef } from 'react';
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
  Play,
} from 'lucide-react';
import {
  AuthUser,
  loginAccount,
  registerAccount,
  signUpWithGoogleGmail,
} from '../db/firebase';
import {
  GlassCard,
  GlassButton,
  GlassBadge,
  GlassModal,
  AnimatedPeso,
  AnimatedNumber,
} from './ui/GlassComponents';

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

const HERO_KINETIC_WORDS = [
  'Kuryente Bill',
  'Bahay Budget',
  'Palengke Cart',
  'Utang Ledger',
];

const LIVE_DEMO_SCENARIOS = [
  { label: '15th Kinsenas Cutoff', safeToSpend: 18450, kwh: 214, gcash: 6850, cash: 4200 },
  { label: 'Palengke Restock Day', safeToSpend: 16120, kwh: 188, gcash: 5400, cash: 2950 },
  { label: '30th Salary Credited', safeToSpend: 24800, kwh: 229, gcash: 11200, cash: 6500 },
];

function renderSplitChars(text: string, baseDelayMs = 0) {
  return text.split('').map((ch, idx) => (
    <span
      key={`${ch}-${idx}`}
      className="bm-char"
      style={{ animationDelay: `${baseDelayMs + idx * 24}ms` }}
    >
      {ch === ' ' ? '\u00A0' : ch}
    </span>
  ));
}

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
  const [gmailNotifiedUser, setGmailNotifiedUser] = useState<AuthUser | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [demoIndex, setDemoIndex] = useState(0);

  const authFormRef = useRef<HTMLDivElement>(null);
  const authBlurRef = useRef<SVGFEGaussianBlurElement>(null);

  // Rotate 3D Kinetic Hero Phrase & Live Bahay Ticker every 3.4s
  useEffect(() => {
    const timer = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % HERO_KINETIC_WORDS.length);
      setDemoIndex((prev) => (prev + 1) % LIVE_DEMO_SCENARIOS.length);
    }, 3400);
    return () => clearInterval(timer);
  }, []);

  // Bang-Motion §2: Directional SVG feGaussianBlur when toggling Log In <-> Sign Up
  useEffect(() => {
    const formEl = authFormRef.current;
    const blurEl = authBlurRef.current;
    if (!formEl || !blurEl) return;

    const duration = 340;
    const start = performance.now();
    formEl.style.filter = 'url(#bm-auth-mode-blur)';
    let rafId = 0;

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const easeOut = 1 - Math.pow(1 - p, 3);
      const vx = (1 - easeOut) * 24;
      const vy = vx * 0.08;
      blurEl.setAttribute('stdDeviation', `${vx.toFixed(2)} ${vy.toFixed(2)}`);
      formEl.style.transform = `translate3d(${((1 - easeOut) * (mode === 'signup' ? 14 : -14)).toFixed(2)}px, 0, 0)`;

      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        blurEl.setAttribute('stdDeviation', '0 0');
        formEl.style.filter = 'none';
        formEl.style.transform = 'none';
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      if (formEl) {
        formEl.style.filter = 'none';
        formEl.style.transform = 'none';
      }
    };
  }, [mode]);

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
        setErrorMsg('Google sign-in popup was closed.');
      } else {
        setErrorMsg('Use the Sign Up form above with your @gmail.com address to register.');
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
      setErrorMsg('Please enter a valid Gmail or email address.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters for security.');
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
        setSuccessMsg(
          `Gmail notification sent to ${user.email}! Thank you for using BillsTracker, ${user.name}!`
        );
        setGmailNotifiedUser(user);
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

      {/* Bang-Motion §2: SVG Directional Motion Blur Filter for Log In <-> Sign Up Toggle */}
      <svg className="fixed w-0 h-0 opacity-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="bm-auth-mode-blur" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur ref={authBlurRef} stdDeviation="0 0" />
          </filter>
        </defs>
      </svg>

      {/* Main Split-Screen Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Scannable Value Showcase */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill border border-teal-400/35 text-xs font-bold text-teal-200 bm-float-badge">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                <span>Bahay Financial Peace of Mind</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-500/25 via-rose-500/25 to-amber-500/25 hover:from-violet-500/45 hover:to-amber-500/45 border border-amber-400/45 text-xs font-bold text-amber-200 transition-transform hover:-translate-y-0.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-amber-300 text-amber-300" aria-hidden="true" />
                <span>Watch Motion Promo</span>
              </button>
            </div>

            <div className="space-y-3 bm-stage">
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.16]">
                <span className="inline-block">{renderSplitChars('Every Peso,', 40)}</span>{' '}
                <span key={wordIndex} className="bm-hl-pill text-amber-200 bm-word-flip">
                  {HERO_KINETIC_WORDS[wordIndex]}
                </span>{' '}
                <span className="inline-block">{renderSplitChars('& Utang in Sync.', 280)}</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Sign in to sync your household wallets, grocery stock, Meralco kWh history, and
                repayment schedules across your phone and PC.
              </p>
            </div>

            {/* Live Native Animated Bahay Telemetry Monitor (Clean, No iFrame, Always 100% Reliable) */}
            <GlassCard
              glowColor="emerald"
              className="p-5 max-w-lg mx-auto lg:mx-0 text-left border border-white/[0.18] shadow-2xl relative overflow-hidden"
            >
              {/* Subtle accent light leak */}
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-12 w-44 h-44 bg-teal-500/15 rounded-full blur-2xl pointer-events-none"
              />

              <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-teal-200">
                    Live Bahay Telemetry
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <GlassBadge tone="amber">
                    {LIVE_DEMO_SCENARIOS[demoIndex].label}
                  </GlassBadge>
                </div>
              </div>

              {/* 3 Real-time Animated Metric Counters */}
              <div className="grid grid-cols-3 gap-3 relative z-10">
                <div className="glass-pill p-3 rounded-2xl border border-white/[0.12] bg-white/[0.03]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Safe To Spend
                  </span>
                  <span className="text-lg sm:text-xl font-black text-emerald-300 tabular-nums mt-1 block tracking-tight">
                    <AnimatedPeso amount={LIVE_DEMO_SCENARIOS[demoIndex].safeToSpend} />
                  </span>
                </div>

                <div className="glass-pill p-3 rounded-2xl border border-white/[0.12] bg-white/[0.03]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Kuryente Meter
                  </span>
                  <span className="text-lg sm:text-xl font-black text-amber-300 tabular-nums mt-1 block tracking-tight">
                    <AnimatedNumber value={LIVE_DEMO_SCENARIOS[demoIndex].kwh} suffix=" kWh" />
                  </span>
                </div>

                <div className="glass-pill p-3 rounded-2xl border border-white/[0.12] bg-white/[0.03]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    GCash + Cash
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white tabular-nums mt-1 block tracking-tight">
                    <AnimatedPeso
                      amount={
                        LIVE_DEMO_SCENARIOS[demoIndex].gcash + LIVE_DEMO_SCENARIOS[demoIndex].cash
                      }
                    />
                  </span>
                </div>
              </div>

              {/* Scenario Interactive Dots */}
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-slate-300 relative z-10">
                <span className="text-slate-400">Real-time household simulation</span>
                <div className="flex items-center gap-1.5">
                  {LIVE_DEMO_SCENARIOS.map((sc, i) => (
                    <button
                      key={sc.label}
                      type="button"
                      onClick={() => setDemoIndex(i)}
                      aria-label={`Show ${sc.label}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        i === demoIndex ? 'w-6 bg-teal-400' : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* 4 Scannable Feature Pills (UI/UX Pro Max: Short 1-3 Word Labels) */}
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto lg:mx-0">
              <GlassCard glowColor="teal" className="p-3.5 flex items-center gap-3 text-left bm-stagger-1">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/35 flex items-center justify-center text-violet-200 shrink-0">
                  <Wallet className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">4 Bahay Wallets</p>
                  <p className="text-[11px] text-slate-300">Cash, GCash, Maya, Bank</p>
                </div>
              </GlassCard>

              <GlassCard glowColor="amber" className="p-3.5 flex items-center gap-3 text-left bm-stagger-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/35 flex items-center justify-center text-amber-200 shrink-0">
                  <Zap className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Kuryente &amp; 6-Mo</p>
                  <p className="text-[11px] text-slate-300">kWh &amp; Bill Analytics</p>
                </div>
              </GlassCard>

              <GlassCard glowColor="rose" className="p-3.5 flex items-center gap-3 text-left bm-stagger-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/35 flex items-center justify-center text-rose-200 shrink-0">
                  <Handshake className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Utang Hub</p>
                  <p className="text-[11px] text-slate-300">Payables &amp; Receivables</p>
                </div>
              </GlassCard>

              <GlassCard glowColor="emerald" className="p-3.5 flex items-center gap-3 text-left bm-stagger-4">
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
              {/* Bang-Motion §5: Light Leak Sweep across Auth Card when switching mode */}
              <div
                key={`leak-${mode}`}
                aria-hidden="true"
                className="bm-auth-leak absolute inset-y-0 w-56 bg-gradient-to-r from-transparent via-fuchsia-400/20 to-transparent blur-2xl z-0"
              />
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

              {/* Animated Mode Container with Directional SVG Motion Blur */}
              <div ref={authFormRef} className="relative z-10">
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
                      : 'Sign Up & Notify My Gmail'}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </GlassButton>
              </form>

              {/* Google / Gmail 1-Click Option */}
              <div className="mt-4">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleGmailAuth}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl glass-pill hover:bg-white/[0.12] border border-white/[0.16] text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Mail className="w-4 h-4 text-rose-400" aria-hidden="true" />
                  <span>
                    {mode === 'signup'
                      ? 'Sign Up with Google (Gmail)'
                      : 'Continue with Google (Gmail)'}
                  </span>
                </button>
              </div>

              {/* Strict Account Requirement Notice & Mode Toggle Link */}
              <div className="mt-5 pt-4 border-t border-white/[0.10] text-center space-y-3">
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

                <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-teal-400/25 text-[11px] font-semibold text-teal-200/90">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-300 shrink-0" aria-hidden="true" />
                  <span>256-Bit Encrypted &amp; Brute-Force Protected</span>
                </div>
              </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Embedded Bang-Motion Interactive Promo Theater Modal */}
      <GlassModal
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
        title="BillsTracker — Cinematic Motion Promo"
        subtitle="Powered by Bang Motion • Single-World Camera Rig & Directional SVG Blur"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-fuchsia-400/35 shadow-2xl bg-slate-950">
            <iframe
              src="./promo.html"
              title="BillsTracker Cinematic Motion Promo"
              className="w-full h-full border-0"
              allow="autoplay"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <span>
              Tip: Press <strong className="text-amber-300">Space</strong> inside the player to pause or{' '}
              <strong className="text-teal-300">R</strong> to replay from 0:00.
            </span>
            <a
              href="./promo.html?debug=1"
              target="_blank"
              rel="noopener noreferrer"
              className="font-extrabold text-fuchsia-300 hover:text-fuchsia-200 underline underline-offset-4"
            >
              Open Fullscreen with Timeline Scrubber (?debug=1) ↗
            </a>
          </div>
        </div>
      </GlassModal>

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
