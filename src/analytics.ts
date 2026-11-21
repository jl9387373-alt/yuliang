import { formatISODate, parseISODate, todayISO } from "./dates";
import { createId } from "./id";

/**
 * 本机埋点：只记录「发生了什么动作」，不记录金额、备注等流水内容。
 * 事件仅存 localStorage，不发送任何网络请求；上限 MAX_EVENTS 条，超出裁剪最旧的。
 * 指标口径见 docs/指标体系与埋点方案.md。
 */
export const EVENTS_KEY = "stu-budget:events:v1";
export const MAX_EVENTS = 500;
export const NORTH_STAR_TARGET = 3;

export const EVENT_NAMES = [
  "app_open",
  "page_view",
  "settings_saved",
  "record_created",
  "record_edited",
  "record_deleted",
  "delete_undone",
  "validation_error",
  "forecast_explained",
  "filter_changed",
  "backup_exported",
  "backup_imported",
  "metrics_viewed",
  "events_exported",
  "events_cleared",
] as const;

export type AnalyticsEventName = (typeof EVENT_NAMES)[number];

export type EventProps = Record<string, string | number | boolean>;

export interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  ts: number;
  day: string;
  props: EventProps;
}

export const EVENT_LABELS: Record<AnalyticsEventName, string> = {
  app_open: "打开应用",
  page_view: "切换页面",
  settings_saved: "保存预算设置",
  record_created: "记下一笔",
  record_edited: "改账",
  record_deleted: "删除记录",
  delete_undone: "撤销删除",
  validation_error: "表单校验拦截",
  forecast_explained: "展开预测说明",
  filter_changed: "使用筛选",
  backup_exported: "导出备份",
  backup_imported: "导入备份",
  metrics_viewed: "查看数据页",
  events_exported: "导出事件日志",
  events_cleared: "清空埋点数据",
};

export interface FunnelStep {
  key: string;
  label: string;
  hint: string;
  reached: boolean;
  count: number;
}

export interface ProductMetrics {
  northStar: number;
  northStarTarget: number;
  totalEvents: number;
  activeDays: number;
  recordsCreated: number;
  firstDay: string | null;
  returnedLater: boolean;
  funnel: FunnelStep[];
  validationErrorRate: number | null;
  undoRate: number | null;
  deleteRate: number | null;
  last7: { day: string; records: number }[];
}

/** 纯函数：校验一条事件，坏数据直接丢弃而不是让页面白屏 */
export function isValidEvent(value: unknown): value is AnalyticsEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<AnalyticsEvent>;
  if (typeof e.id !== "string" || typeof e.ts !== "number") return false;
  if (typeof e.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(e.day)) return false;
  if (!EVENT_NAMES.includes(e.name as AnalyticsEventName)) return false;
  return !!e.props && typeof e.props === "object" && !Array.isArray(e.props);
}

export function parseEvents(raw: unknown): AnalyticsEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidEvent).slice(-MAX_EVENTS);
}

export function appendEvent(
  events: AnalyticsEvent[],
  event: AnalyticsEvent,
): AnalyticsEvent[] {
  return [...events, event].slice(-MAX_EVENTS);
}

export function makeEvent(
  name: AnalyticsEventName,
  props: EventProps = {},
  now = new Date(),
): AnalyticsEvent {
  return {
    id: createId(),
    name,
    ts: now.getTime(),
    day: formatISODate(now),
    props,
  };
}

/** 含今天在内的最近 n 个自然日，升序 */
export function lastNDays(today: string, n: number): string[] {
  const base = parseISODate(today).getTime();
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    days.push(formatISODate(new Date(base - i * 24 * 60 * 60 * 1000)));
  }
  return days;
}

function count(events: AnalyticsEvent[], name: AnalyticsEventName): number {
  return events.filter((e) => e.name === name).length;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

/** 纯函数：所有指标只依赖事件日志与「今天」，便于单测与口径复核 */
export function computeMetrics(
  events: AnalyticsEvent[],
  today = todayISO(),
): ProductMetrics {
  const window = lastNDays(today, 7);
  const windowSet = new Set(window);
  const created = events.filter((e) => e.name === "record_created");
  const recordDays = new Set(
    created.filter((e) => windowSet.has(e.day)).map((e) => e.day),
  );
  const allDays = new Set(events.map((e) => e.day));
  const firstTs = events.length ? Math.min(...events.map((e) => e.ts)) : null;
  const firstDay = firstTs === null ? null : formatISODate(new Date(firstTs));
  const openDays = new Set(
    events.filter((e) => e.name === "app_open").map((e) => e.day),
  );
  const returnedLater = firstDay
    ? [...openDays].some((day) => day > firstDay)
    : false;

  const settingsDone = events.filter(
    (e) => e.name === "settings_saved" && e.props.hasAllowance === true,
  ).length;
  const explained = count(events, "forecast_explained");
  const funnel: FunnelStep[] = [
    {
      key: "open",
      label: "打开应用",
      hint: "每个浏览器会话记一次",
      reached: count(events, "app_open") > 0,
      count: count(events, "app_open"),
    },
    {
      key: "setup",
      label: "完成预算设置",
      hint: "保存了非零生活费",
      reached: settingsDone > 0,
      count: settingsDone,
    },
    {
      key: "record",
      label: "记下第一笔",
      hint: "产生第一条流水",
      reached: created.length > 0,
      count: created.length,
    },
    {
      key: "understand",
      label: "看懂预测",
      hint: "展开「怎么算的」",
      reached: explained > 0,
      count: explained,
    },
    {
      key: "return",
      label: "隔天回访",
      hint: "首日之后再次打开",
      reached: returnedLater,
      count: returnedLater ? 1 : 0,
    },
  ];

  const validationErrors = count(events, "validation_error");
  const deletions = count(events, "record_deleted");
  const undos = count(events, "delete_undone");

  return {
    northStar: recordDays.size,
    northStarTarget: NORTH_STAR_TARGET,
    totalEvents: events.length,
    activeDays: allDays.size,
    recordsCreated: created.length,
    firstDay,
    returnedLater,
    funnel,
    validationErrorRate: rate(
      validationErrors,
      validationErrors + created.length + count(events, "record_edited"),
    ),
    undoRate: rate(undos, deletions),
    deleteRate: rate(deletions, created.length),
    last7: window.map((day) => ({
      day,
      records: created.filter((e) => e.day === day).length,
    })),
  };
}

// —— 本机存储 + 订阅（供 React useSyncExternalStore 使用）——

let snapshot: AnalyticsEvent[] | null = null;
const listeners = new Set<() => void>();

function read(): AnalyticsEvent[] {
  if (snapshot) return snapshot;
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    snapshot = raw ? parseEvents(JSON.parse(raw) as unknown) : [];
  } catch {
    snapshot = [];
  }
  return snapshot;
}

export function getEvents(): AnalyticsEvent[] {
  return read();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(next: AnalyticsEvent[]): void {
  snapshot = next;
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  } catch {
    // 隐私模式 / 配额不足时，埋点失败不应影响记账主流程
  }
  listeners.forEach((listener) => listener());
}

export function track(
  name: AnalyticsEventName,
  props: EventProps = {},
): AnalyticsEvent {
  const event = makeEvent(name, props);
  write(appendEvent(read(), event));
  return event;
}

export function clearEvents(): void {
  write([]);
  track("events_cleared");
}
