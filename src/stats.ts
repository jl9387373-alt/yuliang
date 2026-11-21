import { calendarDaysUntil, currentMonthKey, monthKeyFromISO, todayISO } from "./dates";
import type { AppState, ExpenseCategory, Transaction } from "./types";
import { EXPENSE_CATEGORIES } from "./types";

export interface MonthSummary {
  monthKey: string;
  allowanceFen: number;
  carryoverFen: number;
  extraIncomeFen: number;
  expenseFen: number;
  remainingFen: number;
}

export interface CategorySlice {
  id: ExpenseCategory;
  label: string;
  amountFen: number;
}

export interface Forecast {
  status: "ready" | "missing" | "expired";
  remainingDays: number;
  estimatedNeedFen: number;
  leftoverFen: number;
}

export function transactionsInMonth(
  transactions: Transaction[],
  monthKey: string,
): Transaction[] {
  return transactions.filter((t) => monthKeyFromISO(t.date) === monthKey);
}

/**
 * 已设置生活费的月份把结余累计到之后，避免「新月份还没填生活费 → 剩余归零/误报超支」。
 * 只统计配置过生活费的月份：没设预算的月份不参与结转，避免把未记录的消费变成跨月负债。
 */
export function carryoverBefore(state: AppState, monthKey: string): number {
  const budgetedMonths = Object.keys(state.settings.allowanceByMonth).filter(
    (m) => m < monthKey,
  );
  if (budgetedMonths.length === 0) return 0;
  const monthSet = new Set(budgetedMonths);
  let carryover = budgetedMonths.reduce(
    (sum, m) => sum + (state.settings.allowanceByMonth[m] ?? 0),
    0,
  );
  for (const t of state.transactions) {
    if (!monthSet.has(monthKeyFromISO(t.date))) continue;
    carryover += t.type === "income" ? t.amountFen : -t.amountFen;
  }
  return carryover;
}

export function summarizeMonth(state: AppState, monthKey: string): MonthSummary {
  const list = transactionsInMonth(state.transactions, monthKey);
  const extraIncomeFen = list
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amountFen, 0);
  const expenseFen = list
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amountFen, 0);
  const allowanceFen = state.settings.allowanceByMonth[monthKey] ?? 0;
  const carryoverFen = carryoverBefore(state, monthKey);
  return {
    monthKey,
    allowanceFen,
    carryoverFen,
    extraIncomeFen,
    expenseFen,
    remainingFen: carryoverFen + allowanceFen + extraIncomeFen - expenseFen,
  };
}

export function expenseByCategory(
  transactions: Transaction[],
  monthKey: string,
): CategorySlice[] {
  const list = transactionsInMonth(transactions, monthKey).filter(
    (t) => t.type === "expense",
  );
  return EXPENSE_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    amountFen: list
      .filter((t) => t.category === c.id)
      .reduce((sum, t) => sum + t.amountFen, 0),
  })).filter((slice) => slice.amountFen > 0);
}

export function sortBillsDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}

export function latestRecordTime(transactions: Transaction[]): number | null {
  if (transactions.length === 0) return null;
  return Math.max(...transactions.map((t) => t.createdAt));
}

export function computeForecast(
  remainingFen: number,
  nextAllowanceDate: string,
  dailyMealFen: number,
  unpaidNecessaryFen: number,
  today = todayISO(),
): Forecast {
  if (!nextAllowanceDate) {
    return {
      status: "missing",
      remainingDays: 0,
      estimatedNeedFen: 0,
      leftoverFen: remainingFen,
    };
  }
  const days = calendarDaysUntil(today, nextAllowanceDate);
  if (days < 0) {
    return {
      status: "expired",
      remainingDays: 0,
      estimatedNeedFen: 0,
      leftoverFen: remainingFen,
    };
  }
  const remainingDays = days;
  const estimatedNeedFen = remainingDays * dailyMealFen + unpaidNecessaryFen;
  return {
    status: "ready",
    remainingDays,
    estimatedNeedFen,
    leftoverFen: remainingFen - estimatedNeedFen,
  };
}

export function availableMonths(transactions: Transaction[]): string[] {
  const set = new Set<string>([currentMonthKey()]);
  for (const t of transactions) set.add(monthKeyFromISO(t.date));
  return [...set].sort((a, b) => (a < b ? 1 : -1));
}
