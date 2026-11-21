import { isValidISODate } from "./dates";
import {
  defaultState,
  EXPENSE_CATEGORIES,
  type AppState,
  type Settings,
  type Transaction,
} from "./types";

export const STORAGE_KEY = "stu-budget:v1";
export const CORRUPT_KEY = "stu-budget:v1:corrupt";
export const EXPORT_FORMAT = "stu-budget-backup";
export const EXPORT_VERSION = 1;

const NOTE_MAX_LENGTH = 80;
const EXPENSE_CATEGORY_IDS = new Set<string>(EXPENSE_CATEGORIES.map((c) => c.id));
const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export type LoadStatus = "ok" | "empty" | "corrupt" | "unavailable";

export interface LoadResult {
  state: AppState;
  status: LoadStatus;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isTransaction(value: unknown): value is Transaction {
  if (!isPlainObject(value)) return false;
  if (typeof value.id !== "string" || value.id.length === 0) return false;
  if (value.type !== "income" && value.type !== "expense") return false;
  if (!isPositiveSafeInteger(value.amountFen)) return false;
  if (typeof value.category !== "string") return false;
  if (value.type === "expense") {
    if (!EXPENSE_CATEGORY_IDS.has(value.category)) return false;
  } else if (value.category !== "extra") {
    return false;
  }
  if (typeof value.date !== "string" || !isValidISODate(value.date)) return false;
  if (typeof value.note !== "string" || value.note.length > NOTE_MAX_LENGTH) return false;
  return (
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt) &&
    value.createdAt > 0
  );
}

function isSettings(value: unknown): value is Settings {
  if (!isPlainObject(value)) return false;
  const allowance = value.allowanceByMonth;
  if (!isPlainObject(allowance)) return false;
  for (const [month, amount] of Object.entries(allowance)) {
    if (!MONTH_KEY_PATTERN.test(month)) return false;
    if (!isSafeNonNegativeInteger(amount)) return false;
  }
  if (typeof value.nextAllowanceDate !== "string") return false;
  if (value.nextAllowanceDate && !isValidISODate(value.nextAllowanceDate)) return false;
  return (
    isSafeNonNegativeInteger(value.dailyMealFen) &&
    isSafeNonNegativeInteger(value.unpaidNecessaryFen)
  );
}

function payloadOf(raw: Record<string, unknown>): unknown {
  return "data" in raw ? raw.data : raw;
}

/**
 * 导入备份用的严格校验：任何一条坏数据都拒绝整份文件，
 * 避免「导入后部分账单消失」或首页出现 ¥NaN.NaN。
 */
export function validateAppState(raw: unknown): {
  state: AppState | null;
  errors: string[];
} {
  if (!isPlainObject(raw)) {
    return { state: null, errors: ["文件内容不是 JSON 对象。"] };
  }
  if ("format" in raw && raw.format !== EXPORT_FORMAT) {
    return { state: null, errors: ["不是本应用导出的备份文件（format 不匹配）。"] };
  }
  if (
    typeof raw.version === "number" &&
    Number.isInteger(raw.version) &&
    raw.version > EXPORT_VERSION
  ) {
    return {
      state: null,
      errors: [`备份版本 v${raw.version} 高于当前支持的 v${EXPORT_VERSION}。`],
    };
  }

  const payload = payloadOf(raw);
  if (!isPlainObject(payload)) {
    return { state: null, errors: ["备份缺少 data 数据。"] };
  }

  const errors: string[] = [];
  const transactions = payload.transactions;
  const settings = payload.settings;
  if (!Array.isArray(transactions)) errors.push("缺少账单列表 transactions。");
  if (!isSettings(settings)) {
    errors.push(
      "设置字段无效：生活费/餐费/必要费用必须是非负整数（分），月份键格式为 YYYY-MM。",
    );
  }
  if (!Array.isArray(transactions) || !isSettings(settings)) {
    return { state: null, errors };
  }

  const seen = new Set<string>();
  transactions.forEach((item, index) => {
    if (!isTransaction(item)) {
      errors.push(`第 ${index + 1} 条账单无效（检查分类、日期、金额、备注长度）。`);
      return;
    }
    if (seen.has(item.id)) {
      errors.push(`第 ${index + 1} 条账单的 id 与前面重复。`);
    }
    seen.add(item.id);
  });

  if (errors.length > 0) return { state: null, errors };
  return {
    state: { transactions: transactions as Transaction[], settings },
    errors: [],
  };
}

/**
 * 读取本机数据时用宽松校验：坏行丢弃、坏设置回退空状态，
 * 避免一条损坏记录让整个页面白屏。
 */
export function parseAppState(raw: unknown): AppState | null {
  if (!isPlainObject(raw)) return null;
  if ("format" in raw && raw.format !== EXPORT_FORMAT) return null;

  const payload = payloadOf(raw);
  if (!isPlainObject(payload)) return null;
  const settings = payload.settings;
  const transactions = payload.transactions;
  if (!isSettings(settings) || !Array.isArray(transactions)) return null;

  const seen = new Set<string>();
  const valid: Transaction[] = [];
  for (const item of transactions) {
    if (!isTransaction(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    valid.push(item);
  }
  return { transactions: valid, settings };
}

export function loadStateWithStatus(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: defaultState(), status: "unavailable" };
  }
  if (!raw) return { state: defaultState(), status: "empty" };

  try {
    const state = parseAppState(JSON.parse(raw) as unknown);
    if (state) return { state, status: "ok" };
  } catch {
    // 解析失败按损坏处理，下面把原文另存一份再回退
  }

  try {
    // 总是保留最近一次损坏的原文，避免回退空状态后把唯一证据覆盖掉
    localStorage.setItem(CORRUPT_KEY, raw);
  } catch {
    // 存储本身不可用时无法备份
  }
  return { state: defaultState(), status: "corrupt" };
}

export function loadState(): AppState {
  return loadStateWithStatus().state;
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // 隐私模式 / 配额不足 / 部分浏览器打开本地文件时会禁用存储：
    // 返回 false，由界面提示用户先导出备份（不能静默丢数据）。
    return false;
  }
}

export function buildExportPayload(state: AppState) {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  };
}

export function exportStateJson(state: AppState): string {
  return `${JSON.stringify(buildExportPayload(state), null, 2)}\n`;
}

export function importStateFromJson(text: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("文件不是合法的 JSON。");
  }
  const result = validateAppState(parsed);
  if (!result.state) {
    const details = result.errors.slice(0, 3).join("；");
    const rest =
      result.errors.length > 3 ? `；另有 ${result.errors.length - 3} 处问题` : "";
    throw new Error(`备份文件格式无效：${details || "无法读取数据"}${rest}。`);
  }
  return result.state;
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
