import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BillList from "./components/BillList";
import EmptyState from "./components/EmptyState";
import {
  IconArrow,
  IconBills,
  IconCalendar,
  IconChart,
  IconClock,
  IconClose,
  IconCoin,
  IconFilter,
  IconFood,
  IconFrown,
  IconGift,
  IconHeart,
  IconHelp,
  IconHome,
  IconLeaf,
  IconLock,
  IconOut,
  IconPiggy,
  IconPlus,
  IconSettings,
  IconSmile,
  IconSpark,
  IconStar,
  IconTarget,
  IconUndo,
  IconWallet,
  IconWarn,
  IconZap,
} from "./components/Icons";
import MetricsPanel from "./components/MetricsPanel";
import PieChart from "./components/PieChart";
import RecordModal from "./components/RecordModal";
import SettingsPanel from "./components/SettingsPanel";
import "./App.css";
import { track } from "./analytics";
import { currentMonthKey, formatDateTime, formatMonthLabel, todayISO } from "./dates";
import { createId } from "./id";
import { formatYuan } from "./money";
import { STORAGE_KEY, loadStateWithStatus, parseAppState, saveState } from "./storage";
import {
  availableMonths,
  computeForecast,
  expenseByCategory,
  latestRecordTime,
  sortBillsDesc,
  summarizeMonth,
} from "./stats";
import {
  EXPENSE_CATEGORIES,
  type AppState,
  type ExpenseCategory,
  type Settings,
  type Transaction,
} from "./types";

type Page = "home" | "bills" | "settings" | "metrics";
type CategoryFilter = "all" | ExpenseCategory | "extra";
type TypeFilter = "all" | "expense" | "income";

const UNDO_MS = 5000;

const STORAGE_UNAVAILABLE_NOTE =
  "本机存储不可用（隐私模式或空间不足）：这次记录只保存在当前页面，刷新后会丢失。请先到设置里导出备份。";
const STORAGE_CORRUPT_NOTE =
  "本机账单读取失败，已回退空状态；原始内容已备份在浏览器里（stu-budget:v1:corrupt）。可导入最近的 JSON 备份恢复。";

export default function App() {
  const [initialLoad] = useState(loadStateWithStatus);
  const [state, setState] = useState<AppState>(initialLoad.state);
  const [storageIssue, setStorageIssue] = useState<"corrupt" | "unavailable" | null>(() => {
    if (initialLoad.status === "unavailable") return "unavailable";
    if (initialLoad.status === "corrupt") return "corrupt";
    return null;
  });
  const [page, setPage] = useState<Page>("home");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [undoItem, setUndoItem] = useState<Transaction | null>(null);
  const undoTimer = useRef<number | null>(null);
  const [month, setMonth] = useState(currentMonthKey());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [settingsKey, setSettingsKey] = useState(0);
  const lastPage = useRef<Page | null>(null);
  const appOpened = useRef(false);
  const externalUpdate = useRef(false);

  // 另一个标签页写入时同步，避免两边各写各的互相覆盖
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = parseAppState(JSON.parse(event.newValue) as unknown);
        if (!next) return;
        externalUpdate.current = true;
        setState(next);
      } catch {
        // 忽略另一个标签页写入的坏数据
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    // 另一个标签页同步过来的状态无需再写回，避免两边来回触发
    if (externalUpdate.current) {
      externalUpdate.current = false;
      return;
    }
    // 损坏数据且用户还没操作过：先不要用空状态覆盖原文（原文已另存一份）
    if (initialLoad.status === "corrupt" && state === initialLoad.state) return;
    if (saveState(state)) {
      setStorageIssue((prev) => (prev === "unavailable" ? null : prev));
    } else {
      setStorageIssue((prev) => prev ?? "unavailable");
    }
  }, [state, initialLoad]);

  // 埋点：每个浏览器会话记一次打开；StrictMode 双跑由 ref + sessionStorage 去重
  useEffect(() => {
    if (appOpened.current) return;
    appOpened.current = true;
    try {
      if (sessionStorage.getItem("stu-budget:opened")) return;
      sessionStorage.setItem("stu-budget:opened", "1");
    } catch {
      // 隐私模式下 sessionStorage 不可用时，退化为按本次挂载记一次
    }
    track("app_open");
  }, []);

  useEffect(() => {
    if (lastPage.current === page) return;
    lastPage.current = page;
    track("page_view", { page });
  }, [page]);

  useEffect(() => {
    if (!toast || undoItem) return;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast, undoItem]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const thisMonth = currentMonthKey();
  const summary = useMemo(() => summarizeMonth(state, thisMonth), [state, thisMonth]);
  const slices = useMemo(
    () => expenseByCategory(state.transactions, thisMonth),
    [state.transactions, thisMonth],
  );
  const recent = useMemo(
    () => sortBillsDesc(state.transactions).slice(0, 3),
    [state.transactions],
  );
  const monthBills = useMemo(() => {
    const list = state.transactions.filter((t) => t.date.startsWith(month));
    const typed =
      typeFilter === "all" ? list : list.filter((t) => t.type === typeFilter);
    const filtered =
      categoryFilter === "all"
        ? typed
        : typed.filter((t) => t.category === categoryFilter);
    return sortBillsDesc(filtered);
  }, [state.transactions, month, typeFilter, categoryFilter]);
  const months = useMemo(() => availableMonths(state.transactions), [state.transactions]);
  const lastTime = latestRecordTime(state.transactions);
  const forecast = computeForecast(
    summary.remainingFen,
    state.settings.nextAllowanceDate,
    state.settings.dailyMealFen,
    state.settings.unpaidNecessaryFen,
  );
  const editingRecord = editingId
    ? state.transactions.find((t) => t.id === editingId)
    : undefined;

  function showToast(message: string) {
    setUndoItem(null);
    if (undoTimer.current) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setToast(message);
  }

  function addRecord(input: Omit<Transaction, "id" | "createdAt">) {
    try {
      const record: Transaction = {
        ...input,
        id: createId(),
        createdAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        transactions: [record, ...prev.transactions],
      }));
      setModalMode(null);
      showToast("已记下一笔，预算和统计已更新。");
      track("record_created", { type: input.type });
    } catch {
      showToast("保存失败，请重试。");
    }
  }

  function updateRecord(input: Omit<Transaction, "id" | "createdAt">) {
    if (!editingId) return;
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === editingId ? { ...t, ...input } : t,
      ),
    }));
    setModalMode(null);
    setEditingId(null);
    showToast("账单已更新，预算和统计已同步。");
    track("record_edited", { type: input.type });
  }

  function deleteRecord(id: string) {
    const target = state.transactions.find((t) => t.id === id);
    if (!target) return;
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
    setUndoItem(target);
    setToast("记录已删除。");
    track("record_deleted");
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = window.setTimeout(() => {
      setUndoItem(null);
      setToast("");
      undoTimer.current = null;
    }, UNDO_MS);
  }

  function undoDelete() {
    if (!undoItem) return;
    const restored = undoItem;
    setState((prev) => ({
      ...prev,
      transactions: [restored, ...prev.transactions.filter((t) => t.id !== restored.id)],
    }));
    if (undoTimer.current) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setUndoItem(null);
    setToast("已撤销删除。");
    track("delete_undone");
  }

  function openEdit(id: string) {
    setEditingId(id);
    setModalMode("edit");
  }

  function saveSettings(settings: Settings) {
    setState((prev) => ({ ...prev, settings }));
    track("settings_saved", {
      hasAllowance: (settings.allowanceByMonth[currentMonthKey()] ?? 0) > 0,
    });
  }

  function replaceState(next: AppState) {
    setState(next);
    setMonth(currentMonthKey());
    setTypeFilter("all");
    setCategoryFilter("all");
    setSettingsKey((k) => k + 1);
    setStorageIssue(null);
    showToast("备份已导入。");
  }

  const forecastPlain =
    forecast.status === "ready"
      ? `到账前还有 ${forecast.remainingDays} 天：按每天餐费约 ${formatYuan(state.settings.dailyMealFen)} 算餐费，再加尚未支付必要费用 ${formatYuan(state.settings.unpaidNecessaryFen)}，合计预计需要 ${formatYuan(forecast.estimatedNeedFen)}。当前可用 ${formatYuan(Math.abs(summary.remainingFen))}${summary.remainingFen < 0 ? "（已透支）" : ""}，因此预计${forecast.leftoverFen < 0 ? "缺口" : "结余"} ${formatYuan(Math.abs(forecast.leftoverFen))}。`
      : "";

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-inline">
          <span className="brand-mark" aria-hidden="true">
            <IconLeaf size={16} />
          </span>
          <strong>余量</strong>
        </div>
        <nav className="nav" aria-label="主导航">
          <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>
            <IconHome size={15} />
            首页
          </button>
          <button className={page === "bills" ? "active" : ""} onClick={() => setPage("bills")}>
            <IconBills size={15} />
            账单
          </button>
          <button
            className={page === "settings" ? "active" : ""}
            onClick={() => setPage("settings")}
          >
            <IconSettings size={15} />
            设置
          </button>
          <button
            className={page === "metrics" ? "active" : ""}
            onClick={() => setPage("metrics")}
          >
            <IconChart size={15} />
            数据
          </button>
        </nav>
      </header>

      {storageIssue ? (
        <div className="storage-warning" role="alert">
          <span className="storage-warning-text">
            <IconWarn size={16} />
            {storageIssue === "corrupt" ? STORAGE_CORRUPT_NOTE : STORAGE_UNAVAILABLE_NOTE}
          </span>
          <span className="storage-warning-actions">
            <button type="button" className="btn ghost" onClick={() => setPage("settings")}>
              {storageIssue === "corrupt" ? "去导入" : "去备份"}
            </button>
            <button
              type="button"
              className="btn ghost"
              aria-label="关闭提示"
              onClick={() => setStorageIssue(null)}
            >
              <IconClose size={15} />
            </button>
          </span>
        </div>
      ) : null}

      {page === "home" ? (
        <div className="home-page">
          <section className="hero-stage">
            <div className="hero-copy">
              <p className="hero-kicker">
                <IconStar size={12} />
                {formatMonthLabel(thisMonth)} · 本月概览
                <IconHeart size={12} />
              </p>
              <h1 className="hero-brand">
                <span className="hero-mood" aria-hidden="true">
                  {summary.remainingFen < 0 ? <IconFrown size={22} /> : <IconSmile size={22} />}
                </span>
                {summary.remainingFen < 0 ? "这个月已经超支" : "这个月还能花"}
              </h1>
              <p className="hero-lead">
                <IconZap size={14} />
                {`生活费 + 额外收入 − 已支出${
                  summary.carryoverFen > 0
                    ? " + 上月结余"
                    : summary.carryoverFen < 0
                      ? " − 上月透支"
                      : ""
                }，预测在下方。`}
              </p>
            </div>

            <div className="hero-balance">
              <p className="hero-balance-label">
                <IconWallet size={14} />
                {summary.remainingFen < 0 ? "实际缺口" : "剩余可用"}
              </p>
              <p
                className={`hero-balance-value ${summary.remainingFen < 0 ? "is-gap" : "is-ok"}`}
              >
                {formatYuan(Math.abs(summary.remainingFen))}
              </p>
              {summary.carryoverFen !== 0 ? (
                <p className={`hero-carry ${summary.carryoverFen < 0 ? "is-gap" : ""}`}>
                  含{summary.carryoverFen < 0 ? "上月透支" : "上月结余"}{" "}
                  <strong>{formatYuan(Math.abs(summary.carryoverFen))}</strong>
                </p>
              ) : null}
            </div>

            <div className="hero-strip" aria-label="本月预算概览">
              <div>
                <span>
                  <IconPiggy size={12} />
                  生活费
                </span>
                <strong>{formatYuan(summary.allowanceFen)}</strong>
              </div>
              <div>
                <span>
                  <IconCoin size={12} />
                  额外收入
                </span>
                <strong>{formatYuan(summary.extraIncomeFen)}</strong>
              </div>
              <div>
                <span>
                  <IconOut size={12} />
                  已支出
                </span>
                <strong>{formatYuan(summary.expenseFen)}</strong>
              </div>
            </div>

            <div className="hero-actions">
              <button
                className="btn primary hero-cta"
                onClick={() => {
                  setEditingId(null);
                  setModalMode("create");
                }}
              >
                <IconPlus size={17} />
                记一笔
              </button>
              <button className="btn ghost" type="button" onClick={() => setPage("settings")}>
                <IconSettings size={16} />
                调整预算
              </button>
            </div>
          </section>

          <section className="forecast-band">
            <div className="forecast-band-head">
              <div>
                <h2>
                  <IconSpark size={18} />
                  够用预测
                </h2>
                <p className="forecast-sub">日餐费 × 天数 + 尚未支付必要费用</p>
              </div>
              <span className="chip chip-today">
                <IconCalendar size={13} />
                今天 {todayISO()}
              </span>
            </div>

            {forecast.status === "missing" ? (
              <p className="warn">
                <IconWarn size={16} />
                请先在设置里填写下次生活费到账日期，才能开始预测。
              </p>
            ) : null}
            {forecast.status === "expired" ? (
              <p className="warn">
                <IconWarn size={16} />
                到账日期已过期（{state.settings.nextAllowanceDate}），请更新日期后再预测。
              </p>
            ) : null}
            {forecast.status === "ready" ? (
              <>
                <div className="forecast-metrics">
                  <div>
                    <span>
                      <IconClock size={12} />
                      剩余天数
                    </span>
                    <strong>
                      {forecast.remainingDays}
                      <small> 天</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      <IconFood size={12} />
                      预计所需
                    </span>
                    <strong>{formatYuan(forecast.estimatedNeedFen)}</strong>
                  </div>
                  <div>
                    <span>
                      <IconWallet size={12} />
                      {forecast.leftoverFen < 0 ? "预计缺口" : "预计结余"}
                    </span>
                    <strong className={forecast.leftoverFen < 0 ? "gap" : "ok"}>
                      {formatYuan(Math.abs(forecast.leftoverFen))}
                    </strong>
                  </div>
                </div>
                <details className="fold">
                  <summary
                    onClick={(e) => {
                      const details = e.currentTarget.closest("details");
                      if (details && !details.open) track("forecast_explained");
                    }}
                  >
                    <IconHelp size={14} />
                    怎么算的？
                  </summary>
                  <p className="forecast-plain">{forecastPlain}</p>
                  <p className="note forecast-foot">
                    <IconClock size={13} />
                    必要费用付完并记账后，请到设置里更新“尚未支付的必要费用”。
                    最近记账：{lastTime ? formatDateTime(lastTime) : "还没有记账"}
                  </p>
                </details>
              </>
            ) : (
              <p className="note forecast-foot">
                <IconClock size={13} />
                最近记账：{lastTime ? formatDateTime(lastTime) : "还没有记账"}
              </p>
            )}
          </section>

          <section className="split-panel">
            <div className="panel-block">
              <div className="section-head">
                <h2>
                  <IconChart size={17} />
                  当月分类
                </h2>
                <span className="chip">
                  <IconTarget size={12} />
                  {slices.length}类
                </span>
              </div>
              {slices.length === 0 ? (
                <EmptyState compact icon={<IconGift size={26} />}>
                  还没有支出，记一笔后显示占比。
                </EmptyState>
              ) : (
                <PieChart slices={slices} />
              )}
            </div>
            <div className="panel-block">
              <div className="section-head">
                <h2>
                  <IconBills size={17} />
                  最近账单
                </h2>
                <button type="button" className="btn ghost" onClick={() => setPage("bills")}>
                  全部
                  <IconArrow size={14} />
                </button>
              </div>
              <BillList bills={recent} onDelete={deleteRecord} onEdit={openEdit} />
            </div>
          </section>
        </div>
      ) : null}

      {page === "bills" ? (
        <section className="card">
          <div className="section-head">
            <h2>
              <IconBills size={18} />
              账单管理
            </h2>
            <span className="chip">
              <IconFilter size={12} />
              可改账 · 可筛选
            </span>
          </div>
          <div className="toolbar">
            <label className="toolbar-field">
              <span className="toolbar-label">
                <IconCalendar size={13} />
                月份
              </span>
              <select
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  track("filter_changed", { kind: "month" });
                }}
                aria-label="选择月份"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </label>
            <label className="toolbar-field">
              <span className="toolbar-label">
                <IconFilter size={13} />
                类型
              </span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TypeFilter);
                  track("filter_changed", { kind: "type" });
                }}
                aria-label="收支类型"
              >
                <option value="all">全部类型</option>
                <option value="expense">仅支出</option>
                <option value="income">仅收入</option>
              </select>
            </label>
            <label className="toolbar-field">
              <span className="toolbar-label">
                <IconChart size={13} />
                分类
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value as CategoryFilter);
                  track("filter_changed", { kind: "category" });
                }}
                aria-label="分类筛选"
              >
                <option value="all">全部分类</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                <option value="extra">额外收入</option>
              </select>
            </label>
            <button
              className="btn primary"
              onClick={() => {
                setEditingId(null);
                setModalMode("create");
              }}
            >
              <IconPlus size={16} />
              记一笔
            </button>
          </div>
          <BillList bills={monthBills} onDelete={deleteRecord} onEdit={openEdit} />
        </section>
      ) : null}

      {page === "settings" ? (
        <>
          <SettingsPanel
            key={settingsKey}
            settings={state.settings}
            state={state}
            onSave={saveSettings}
            onReplaceState={replaceState}
          />
          <p className="note privacy-note">
            <IconLock size={15} />
            全部账单和设置都保存在本机浏览器中，刷新后仍在。清理浏览器数据、卸载浏览器或更换设备可能导致记录丢失；换机前请先「导出备份」。不会上传到网络。
          </p>
        </>
      ) : null}

      {page === "metrics" ? <MetricsPanel /> : null}

      {modalMode === "create" ? (
        <RecordModal
          mode="create"
          onClose={() => setModalMode(null)}
          onSave={addRecord}
        />
      ) : null}

      {modalMode === "edit" && editingRecord ? (
        <RecordModal
          mode="edit"
          initial={editingRecord}
          onClose={() => {
            setModalMode(null);
            setEditingId(null);
          }}
          onSave={updateRecord}
        />
      ) : null}

      {toast
        ? createPortal(
            <div
              className={`toast ${undoItem ? "toast-with-action" : ""}`}
              role="status"
              aria-live="polite"
            >
              <span className="toast-text">
                {undoItem ? <IconWarn size={16} /> : <IconSpark size={16} />}
                {toast}
              </span>
              {undoItem ? (
                <button type="button" className="toast-undo" onClick={undoDelete}>
                  <IconUndo size={14} />
                  撤销
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
