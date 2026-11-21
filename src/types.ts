export type ExpenseCategory =
  | "food"
  | "transport"
  | "entertainment"
  | "study"
  | "shopping"
  | "other";

export type IncomeCategory = "extra";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amountFen: number;
  category: ExpenseCategory | IncomeCategory;
  date: string;
  note: string;
  createdAt: number;
}

export interface Settings {
  allowanceByMonth: Record<string, number>;
  nextAllowanceDate: string;
  dailyMealFen: number;
  unpaidNecessaryFen: number;
}

export interface AppState {
  transactions: Transaction[];
  settings: Settings;
}

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: "food", label: "餐饮" },
  { id: "transport", label: "交通" },
  { id: "entertainment", label: "娱乐" },
  { id: "study", label: "学习" },
  { id: "shopping", label: "购物" },
  { id: "other", label: "其他" },
];

export const INCOME_CATEGORIES: { id: IncomeCategory; label: string }[] = [
  { id: "extra", label: "额外收入" },
];

export const CATEGORY_LABELS: Record<ExpenseCategory | IncomeCategory, string> = {
  food: "餐饮",
  transport: "交通",
  entertainment: "娱乐",
  study: "学习",
  shopping: "购物",
  other: "其他",
  extra: "额外收入",
};

export function defaultState(): AppState {
  return {
    transactions: [],
    settings: {
      allowanceByMonth: {},
      nextAllowanceDate: "",
      dailyMealFen: 0,
      unpaidNecessaryFen: 0,
    },
  };
}
