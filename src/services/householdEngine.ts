import {
  HouseholdDatabaseState,
  MonthlyHistorySnapshot,
  UtangRecord,
  ApplianceEstimate,
} from '../types/database';

export interface CashWithdrawalRecommendation {
  recommendedCashForPalengkeAndGroceries: number;
  recommendedDigitalForBillsAndBnpl: number;
  cashShortfallToWithdraw: number;
  digitalShortfallToCashIn: number;
  adviceSummary: string;
}

export interface HouseholdDashboardMetrics {
  totalWalletBalance: number;
  cashWalletBalance: number;
  digitalWalletBalance: number;
  receivedIncomeThisMonth: number;
  pendingSideHustleIncome: number;
  incomeByType: {
    allowance: number;
    salary: number;
    sideHustle: number;
  };
  expensesByPillar: {
    needs: number;
    wants: number;
    utangPayments: number;
  };
  totalExpenses: number;
  groceriesSpentSoFar: number;
  unpaidUtilityBillsTotal: number;
  dueUtangKoThisCutoff: number;
  totalUtangKoBalance: number;
  totalUtangNilaBalance: number;
  checkedGroceryCartTotal: number;
  uncheckedGroceryEstTotal: number;
  remainingGroceryBudget: number;
  safeToSpend: number;
  daysRemainingInPeriod: number;
  dailySafeBurnRate: number;
  monthlyUtangInstallmentsTotal: number;
  utangDebtToIncomePercent: number;
  utangDebtStatus: 'Safe' | 'Moderate' | 'High';
  cashWithdrawalRecommendation: CashWithdrawalRecommendation;
}

export interface ComputedApplianceBreakdown extends ApplianceEstimate {
  monthlyKwh: number;
  monthlyPeso: number;
  sharePercent: number;
}

export interface KuryenteMetrics {
  prevReading: number;
  currReading: number;
  ratePerKwh: number;
  kwhUsed: number;
  totalCost: number;
  kinsenasHalfSetAside: number;
  targetDailyKwhAllowance: number;
  actualDailyKwhAverage: number;
  budgetVariance: number;
  isWithinBudget: boolean;
  applianceBreakdown: ComputedApplianceBreakdown[];
  estimatedApplianceTotalKwh: number;
  estimatedApplianceTotalPeso: number;
}

export interface SixMonthAnalytics {
  avgKuryentePeso: number;
  avgKuryenteKwh: number;
  avgGroceriesNeeds: number;
  avgTotalNeeds: number;
  avgTotalWants: number;
  avgTotalIncome: number;
  householdSurvivalBaseline: number;
  highestKuryenteMonth: MonthlyHistorySnapshot | null;
  lowestKuryenteMonth: MonthlyHistorySnapshot | null;
  bestSideHustleMonth: MonthlyHistorySnapshot | null;
  totalUtangPaidLastSixMonths: number;
  totalNetSavedLastSixMonths: number;
}

const GROCERY_EXPENSE_CATEGORIES = new Set([
  'Palengke & Wet Market',
  'Supermarket & Pantry',
  'Bigas & Staples',
  'Household & Toiletries',
]);

/**
 * Computes all real-time household financial indicators, Kinsenas cutoff obligations,
 * Safe-to-Spend math, daily allowance burn rate, debt-to-income ratio, and cash vs digital allocation.
 */
export function calculateHouseholdDashboardMetrics(
  db: HouseholdDatabaseState
): HouseholdDashboardMetrics {
  const totalWalletBalance = db.wallets.reduce((sum, w) => sum + w.balance, 0);

  const cashWalletBalance = db.wallets
    .filter((w) => w.id === 'cash' || w.type === 'Cash')
    .reduce((sum, w) => sum + w.balance, 0);

  const digitalWalletBalance = db.wallets
    .filter((w) => w.id !== 'cash' && w.type !== 'Cash')
    .reduce((sum, w) => sum + w.balance, 0);

  const incomeByType = {
    allowance: 0,
    salary: 0,
    sideHustle: 0,
  };

  let receivedIncomeThisMonth = 0;
  let pendingSideHustleIncome = 0;

  for (const inc of db.incomes) {
    if (inc.status === 'received') {
      receivedIncomeThisMonth += inc.amount;
      if (inc.type === 'allowance') incomeByType.allowance += inc.amount;
      else if (inc.type === 'salary') incomeByType.salary += inc.amount;
      else if (inc.type === 'side_hustle') incomeByType.sideHustle += inc.amount;
    } else if (inc.status === 'pending') {
      pendingSideHustleIncome += inc.amount;
    }
  }

  const expensesByPillar = {
    needs: 0,
    wants: 0,
    utangPayments: 0,
  };

  let groceriesSpentSoFar = 0;

  for (const exp of db.expenses) {
    if (exp.pillar === 'need') expensesByPillar.needs += exp.amount;
    else if (exp.pillar === 'want') expensesByPillar.wants += exp.amount;
    else if (exp.pillar === 'utang_payment') expensesByPillar.utangPayments += exp.amount;

    if (
      exp.isFromGroceryChecklist ||
      GROCERY_EXPENSE_CATEGORIES.has(exp.category) ||
      exp.category.toLowerCase().includes('palengke') ||
      exp.category.toLowerCase().includes('supermarket') ||
      exp.category.toLowerCase().includes('bigas')
    ) {
      groceriesSpentSoFar += exp.amount;
    }
  }

  const totalExpenses =
    expensesByPillar.needs + expensesByPillar.wants + expensesByPillar.utangPayments;

  const isSpecificCutoff =
    db.activeCutoff === '1st_kinsenas' || db.activeCutoff === '2nd_kinsenas';

  const unpaidUtilityBillsTotal = db.utilityBills
    .filter(
      (bill) =>
        bill.status === 'unpaid' &&
        (!isSpecificCutoff || bill.cutoff === db.activeCutoff)
    )
    .reduce((sum, bill) => sum + bill.amount, 0);

  const dueUtangKoThisCutoff = db.utangs
    .filter(
      (u) =>
        u.direction === 'utang_ko' &&
        u.status !== 'paid' &&
        (!isSpecificCutoff || u.cutoff === db.activeCutoff)
    )
    .reduce((sum, u) => {
      const remaining = Math.max(0, u.totalAmount - u.paidAmount);
      return sum + Math.min(u.monthlyInstallment, remaining);
    }, 0);

  const totalUtangKoBalance = db.utangs
    .filter((u) => u.direction === 'utang_ko' && u.status !== 'paid')
    .reduce((sum, u) => sum + Math.max(0, u.totalAmount - u.paidAmount), 0);

  const totalUtangNilaBalance = db.utangs
    .filter((u) => u.direction === 'utang_nila' && u.status !== 'paid')
    .reduce((sum, u) => sum + Math.max(0, u.totalAmount - u.paidAmount), 0);

  let checkedGroceryCartTotal = 0;
  let uncheckedGroceryEstTotal = 0;

  for (const item of db.groceries) {
    if (item.isChecked) {
      checkedGroceryCartTotal += item.actualPrice || item.estimatedPrice;
    } else {
      uncheckedGroceryEstTotal += item.estimatedPrice;
    }
  }

  const remainingGroceryBudget = Math.max(0, db.groceriesBudget - groceriesSpentSoFar);

  const safeToSpend =
    totalWalletBalance -
    unpaidUtilityBillsTotal -
    dueUtangKoThisCutoff -
    remainingGroceryBudget;

  const daysRemainingInPeriod =
    db.activeCutoff === '1st_kinsenas'
      ? 9
      : db.activeCutoff === '2nd_kinsenas'
      ? 11
      : 24;

  const dailySafeBurnRate = Math.max(
    0,
    Math.round(safeToSpend / daysRemainingInPeriod)
  );

  const monthlyUtangInstallmentsTotal = db.utangs
    .filter((u) => u.direction === 'utang_ko' && u.status !== 'paid')
    .reduce((sum, u) => sum + u.monthlyInstallment, 0);

  const referenceMonthlyIncome = Math.max(
    1,
    receivedIncomeThisMonth + pendingSideHustleIncome
  );

  const utangDebtToIncomePercent = Math.round(
    (monthlyUtangInstallmentsTotal / referenceMonthlyIncome) * 100
  );

  const utangDebtStatus: 'Safe' | 'Moderate' | 'High' =
    utangDebtToIncomePercent <= 15
      ? 'Safe'
      : utangDebtToIncomePercent <= 25
      ? 'Moderate'
      : 'High';

  const recommendedCashForPalengkeAndGroceries = Math.max(
    remainingGroceryBudget,
    checkedGroceryCartTotal + uncheckedGroceryEstTotal
  );
  const recommendedDigitalForBillsAndBnpl =
    unpaidUtilityBillsTotal + dueUtangKoThisCutoff;

  const cashShortfallToWithdraw = Math.max(
    0,
    recommendedCashForPalengkeAndGroceries - cashWalletBalance
  );
  const digitalShortfallToCashIn = Math.max(
    0,
    recommendedDigitalForBillsAndBnpl - digitalWalletBalance
  );

  let adviceSummary = '';
  if (cashShortfallToWithdraw > 0) {
    adviceSummary = `Mag-withdraw ng ₱${cashShortfallToWithdraw.toLocaleString()} Cash para sa Palengke at Bigas; panatilihing nasa GCash/Maya ang ₱${recommendedDigitalForBillsAndBnpl.toLocaleString()} para sa Bills at Utang.`;
  } else if (digitalShortfallToCashIn > 0) {
    adviceSummary = `Sapat na ang Cash sa pitaka (₱${cashWalletBalance.toLocaleString()}). Mag-cash in ng ₱${digitalShortfallToCashIn.toLocaleString()} sa GCash/Maya para sa Due Bills & BNPL.`;
  } else {
    adviceSummary = `Balanse ang Cash (₱${cashWalletBalance.toLocaleString()}) para sa Palengke at Digital Wallets (₱${digitalWalletBalance.toLocaleString()}) para sa Bills at Installments.`;
  }

  return {
    totalWalletBalance,
    cashWalletBalance,
    digitalWalletBalance,
    receivedIncomeThisMonth,
    pendingSideHustleIncome,
    incomeByType,
    expensesByPillar,
    totalExpenses,
    groceriesSpentSoFar,
    unpaidUtilityBillsTotal,
    dueUtangKoThisCutoff,
    totalUtangKoBalance,
    totalUtangNilaBalance,
    checkedGroceryCartTotal,
    uncheckedGroceryEstTotal,
    remainingGroceryBudget,
    safeToSpend,
    daysRemainingInPeriod,
    dailySafeBurnRate,
    monthlyUtangInstallmentsTotal,
    utangDebtToIncomePercent,
    utangDebtStatus,
    cashWithdrawalRecommendation: {
      recommendedCashForPalengkeAndGroceries,
      recommendedDigitalForBillsAndBnpl,
      cashShortfallToWithdraw,
      digitalShortfallToCashIn,
      adviceSummary,
    },
  };
}

/**
 * Computes Meralco / Submeter kWh consumption, total Peso cost, Kinsenas 50/50 split,
 * target daily kWh ceiling, and individual appliance energy consumption breakdown.
 */
export function calculateKuryenteMetrics(
  db: HouseholdDatabaseState,
  customPrev?: number,
  customCurr?: number,
  customRate?: number
): KuryenteMetrics {
  const latestBill = db.kuryenteBills[0];
  const prevReading =
    typeof customPrev === 'number'
      ? customPrev
      : latestBill
      ? latestBill.prevReading
      : 0;
  const currReading =
    typeof customCurr === 'number'
      ? customCurr
      : latestBill
      ? latestBill.currReading
      : 0;
  const ratePerKwh =
    typeof customRate === 'number' && customRate > 0
      ? customRate
      : latestBill
      ? latestBill.ratePerKwh
      : 11.85;

  const kwhUsed = Math.max(0, Number((currReading - prevReading).toFixed(2)));
  const totalCost = Math.round(kwhUsed * ratePerKwh * 100) / 100;
  const kinsenasHalfSetAside = Math.round((totalCost / 2) * 100) / 100;
  const targetDailyKwhAllowance =
    Math.round((db.kuryenteBudget / ratePerKwh / 30) * 100) / 100;
  const actualDailyKwhAverage = Math.round((kwhUsed / 30) * 100) / 100;

  const rawAppliances = db.appliances.map((app) => {
    const monthlyKwh =
      Math.round(((app.watts * app.hoursPerDay * app.daysPerMonth) / 1000) * 100) /
      100;
    const monthlyPeso = Math.round(monthlyKwh * ratePerKwh * 100) / 100;
    return {
      ...app,
      monthlyKwh,
      monthlyPeso,
    };
  });

  const estimatedApplianceTotalKwh =
    Math.round(rawAppliances.reduce((sum, a) => sum + a.monthlyKwh, 0) * 100) / 100;
  const estimatedApplianceTotalPeso =
    Math.round(rawAppliances.reduce((sum, a) => sum + a.monthlyPeso, 0) * 100) / 100;

  const applianceBreakdown: ComputedApplianceBreakdown[] = rawAppliances.map(
    (app) => ({
      ...app,
      sharePercent:
        estimatedApplianceTotalKwh > 0
          ? Math.round((app.monthlyKwh / estimatedApplianceTotalKwh) * 100)
          : 0,
    })
  );

  const budgetVariance = Math.round((db.kuryenteBudget - totalCost) * 100) / 100;
  const isWithinBudget = totalCost <= db.kuryenteBudget;

  return {
    prevReading,
    currReading,
    ratePerKwh,
    kwhUsed,
    totalCost,
    kinsenasHalfSetAside,
    targetDailyKwhAllowance,
    actualDailyKwhAverage,
    budgetVariance,
    isWithinBudget,
    applianceBreakdown,
    estimatedApplianceTotalKwh,
    estimatedApplianceTotalPeso,
  };
}

/**
 * Computes 6-Month historical averages, household survival baseline, peak/lowest electricity months,
 * best side hustle month, and cumulative Utang paid over the last 6 months.
 */
export function calculateSixMonthAnalytics(
  sixMonthHistory: MonthlyHistorySnapshot[]
): SixMonthAnalytics {
  if (!sixMonthHistory || sixMonthHistory.length === 0) {
    return {
      avgKuryentePeso: 0,
      avgKuryenteKwh: 0,
      avgGroceriesNeeds: 0,
      avgTotalNeeds: 0,
      avgTotalWants: 0,
      avgTotalIncome: 0,
      householdSurvivalBaseline: 0,
      highestKuryenteMonth: null,
      lowestKuryenteMonth: null,
      bestSideHustleMonth: null,
      totalUtangPaidLastSixMonths: 0,
      totalNetSavedLastSixMonths: 0,
    };
  }

  const count = sixMonthHistory.length;

  let sumKuryentePeso = 0;
  let sumKuryenteKwh = 0;
  let sumGroceriesNeeds = 0;
  let sumTotalNeeds = 0;
  let sumTotalWants = 0;
  let sumTotalIncome = 0;
  let totalUtangPaidLastSixMonths = 0;
  let totalNetSavedLastSixMonths = 0;

  let highestKuryenteMonth: MonthlyHistorySnapshot = sixMonthHistory[0];
  let lowestKuryenteMonth: MonthlyHistorySnapshot = sixMonthHistory[0];
  let bestSideHustleMonth: MonthlyHistorySnapshot = sixMonthHistory[0];

  for (const snap of sixMonthHistory) {
    sumKuryentePeso += snap.kuryenteAmount;
    sumKuryenteKwh += snap.kuryenteKwh;
    sumGroceriesNeeds += snap.groceriesAndFoodNeeds;
    sumTotalNeeds += snap.totalNeeds;
    sumTotalWants += snap.totalWants;
    sumTotalIncome += snap.totalIncome;
    totalUtangPaidLastSixMonths += snap.utangPaid;
    totalNetSavedLastSixMonths += snap.netSaved;

    if (snap.kuryenteAmount > highestKuryenteMonth.kuryenteAmount) {
      highestKuryenteMonth = snap;
    }
    if (snap.kuryenteAmount < lowestKuryenteMonth.kuryenteAmount) {
      lowestKuryenteMonth = snap;
    }
    if (snap.sideHustleIncome > bestSideHustleMonth.sideHustleIncome) {
      bestSideHustleMonth = snap;
    }
  }

  const avgKuryentePeso = Math.round(sumKuryentePeso / count);
  const avgKuryenteKwh = Math.round(sumKuryenteKwh / count);
  const avgGroceriesNeeds = Math.round(sumGroceriesNeeds / count);
  const avgTotalNeeds = Math.round(sumTotalNeeds / count);
  const avgTotalWants = Math.round(sumTotalWants / count);
  const avgTotalIncome = Math.round(sumTotalIncome / count);

  const householdSurvivalBaseline = avgTotalNeeds;

  return {
    avgKuryentePeso,
    avgKuryenteKwh,
    avgGroceriesNeeds,
    avgTotalNeeds,
    avgTotalWants,
    avgTotalIncome,
    householdSurvivalBaseline,
    highestKuryenteMonth,
    lowestKuryenteMonth,
    bestSideHustleMonth,
    totalUtangPaidLastSixMonths,
    totalNetSavedLastSixMonths,
  };
}

/**
 * Generates a polite, well-formatted Filipino/English "Statement of Account / Paalala sa Bayarin"
 * ready to copy and send via Messenger, SMS, or Viber.
 */
export function generateSingilStatementText(
  utang: UtangRecord,
  gcashNumber = '0917-555-0198 (Household Vault)'
): string {
  const remainingBalance = Math.max(0, utang.totalAmount - utang.paidAmount);
  const cutoffLabel =
    utang.cutoff === '1st_kinsenas' ? '1st Kinsenas (15th)' : '2nd Kinsenas (30th)';

  return [
    `📋 PAALALA SA BAYARIN / STATEMENT OF ACCOUNT`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Magandang araw po, ${utang.personOrLender}! 👋`,
    `Ito po ang maikling update at paalala para sa ating nakalistang abono / hiniram:`,
    ``,
    `• Layunin (Purpose): ${utang.purpose}`,
    `• Kategorya: ${utang.category}`,
    `• Kabuuang Halaga (Total): ₱${utang.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `• Nabayaran Na (Paid So Far): ₱${utang.paidAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `• Natitirang Balanse (Remaining): ₱${remainingBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `• Hulog Ngayong Cutoff: ₱${Math.min(utang.monthlyInstallment, remainingBalance).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `• Takdang Petsa (Due Date): ${utang.dueDate} (${cutoffLabel})`,
    ``,
    `💳 Maaari pong ipadala sa:`,
    `GCash / Maya: ${gcashNumber}`,
    ``,
    `Pakisend na lang po ng screenshot kapag nakapag-transfer na para ma-update agad sa ating ledger. Maraming salamat po at God bless! 🙏✨`,
  ].join('\n');
}
