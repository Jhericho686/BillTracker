# BahayGlass — UI/UX Pro Max Master Design System (`MASTER.md`)

**Product:** Pure Household Budget, Palengke/Groceries & Needs vs. Wants, Kuryente Bill, 6-Month History, Audit Logs & Utang Tracker  
**Design Paradigm:** Eye-Friendly Twilight Glassmorphism + Big-Number Scannable Data Architecture  
**Skills Applied:** `ui-ux-pro-max` • `design-system` (3-Layer Tokens) • `ui-styling` • `human-uiux-director`

---

## 1. Visual Hierarchy & Micro-Copy Discipline ("Minimal Words, Huge Numbers")

| Element Tier | Typography Class | Usage |
| :--- | :--- | :--- |
| **Hero Primary Metric** | `.metric-hero` (`text-4xl sm:text-6xl font-black tracking-tight tabular-nums leading-none`) | Household Safe-to-Spend |
| **Primary Card Figure** | `.metric-lg` (`text-2xl sm:text-4xl font-extrabold tracking-tight tabular-nums leading-tight`) | Wallet Balances, Monthly Allowance, Salary, Side Hustles, Kuryente Bill, Utang Balances, Audit KPIs |
| **Secondary Metric** | `.metric-md` (`text-xl sm:text-2xl font-bold tabular-nums`) | Daily Burn Limit, Sub-pillar Totals, Grocery Item Prices, Bill Row Amounts |
| **Micro-Label** | `.label-caps` (`text-[11px] font-semibold uppercase tracking-wider text-slate-300`) | 1–3 word labels above or beside numbers (`SAFE TO SPEND`, `DAILY LIMIT`, `UNPAID BILLS`, `UTANG DUE`) |

---

## 2. Three-Layer Token Architecture (`src/index.css`)

1. **Primitive Tokens:**
   - `--slate-950: #0b1322`
   - `--emerald-400: #34d399`
   - `--teal-400: #2dd4bf`
   - `--amber-400: #fbbf24`
   - `--rose-400: #fb7185`
2. **Semantic Tokens (WCAG 2.2 AA/AAA Dark Glass Compliant):**
   - `--surface-base: #0b1322`
   - `--surface-glass: rgba(15, 23, 42, 0.55)`
   - `--border-glass: rgba(255, 255, 255, 0.10)`
   - `--text-primary: #f8fafc`
   - `--text-secondary: #cbd5e1` (Slate 300 — high contrast on dark glass)
   - `--text-muted: #94a3b8` (Slate 400 — 7.02:1 contrast ratio)
   - `--color-accent: #2dd4bf`
3. **Component Tokens:**
   - `--card-bg: rgba(255, 255, 255, 0.05)`
   - `--button-radius: 0.75rem`
   - `--touch-min: 44px`

---

## 3. UI/UX Pro Max Checklist Compliance

- **Accessibility (`ux` Priority 1):**
  - Minimum `4.5:1` / `7:1` text contrast across all glass surfaces.
  - Visible `:focus-visible` `2px` teal glow rings on all interactive elements.
  - `Escape` key dismissal and `role="dialog" aria-modal="true"` on all `GlassModal` instances.
  - Screen-reader polite live region (`role="status" aria-live="polite"`) on toast notifications.
- **Touch & Interaction (`ux` Priority 2):**
  - `min-h-[44px]` / `w-11 h-11` guaranteed tap targets on primary controls, checkboxes, and modal close buttons.
  - `active:scale-[0.97]` tactile press feedback and `cursor-pointer`.
- **Style & Icons (`style` Priority 4):**
  - `no-emoji-icons`: 100% pure `lucide-react` SVG vector icons.
- **Navigation (`ux` Priority 9):**
  - `bottom-nav-limit`: Mobile bottom navigation strictly limited to **5 top-level destinations** (`Bahay`, `Pasok`, `Grocery`, `Kuryente`, `Utang`), with `Audit Logs` accessible in the top header bar.
- **Charts & Data (`chart` Priority 10):**
  - `direct-labeling` & `number-tabular`: All 6-Month History chart bars display direct value labels above each bar using `tabular-nums`.

