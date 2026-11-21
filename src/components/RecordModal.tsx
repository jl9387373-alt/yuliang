import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "../analytics";
import { todayISO, isValidISODate } from "../dates";
import { fenToYuanText, normalizeYuanInput, yuanTextToFen } from "../money";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type ExpenseCategory,
  type IncomeCategory,
  type Transaction,
  type TransactionType,
} from "../types";
import {
  CategoryIcon,
  IconCalendar,
  IconClose,
  IconCoin,
  IconEdit,
  IconIn,
  IconNote,
  IconOut,
  IconPlus,
  IconSave,
  IconTag,
  IconWallet,
} from "./Icons";

interface Props {
  mode: "create" | "edit";
  initial?: Transaction;
  onClose: () => void;
  onSave: (record: Omit<Transaction, "id" | "createdAt">) => void;
}

export default function RecordModal({ mode, initial, onClose, onSave }: Props) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(
    initial ? fenToYuanText(initial.amountFen) : "",
  );
  const [category, setCategory] = useState<ExpenseCategory | IncomeCategory>(
    initial?.category ?? "food",
  );
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    amountRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = bodyOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  function changeType(next: TransactionType) {
    setType(next);
    setCategory(next === "expense" ? "food" : "extra");
  }

  function showError(message: string, field = "amount") {
    setError(message);
    track("validation_error", { field });
    window.setTimeout(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = normalizeYuanInput(amount);
    if (cleaned !== amount) setAmount(cleaned);
    const amountFen = yuanTextToFen(cleaned);
    if (amountFen === null) {
      showError(
        cleaned
          ? "金额格式不对。请用数字，例如 12 或 12.5（不要用中文符号）。"
          : "请先填写金额，例如 12。",
      );
      return;
    }
    const safeDate = date || todayISO();
    if (!isValidISODate(safeDate)) {
      showError("请选择有效日期。", "date");
      return;
    }
    if (safeDate > todayISO()) {
      showError("记账日期不能晚于今天。", "date");
      return;
    }
    if (type === "expense" && !EXPENSE_CATEGORIES.some((c) => c.id === category)) {
      showError("请选择支出分类。", "category");
      return;
    }
    if (type === "income" && category !== "extra") {
      showError("收入只能记为额外收入，生活费请在预算设置中填写。", "category");
      return;
    }
    onSave({
      type,
      amountFen,
      category,
      date: safeDate,
      note: note.trim(),
    });
  }

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-modal-title"
        noValidate
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="section-head">
          <h2 id="record-modal-title">
            {mode === "edit" ? <IconEdit size={18} /> : <IconPlus size={18} />}
            {mode === "edit" ? "改账" : "记一笔"}
          </h2>
          <span className="chip">{mode === "edit" ? "纠错" : "快速录入"}</span>
        </div>
        <p className="note">
          <IconCoin size={14} />
          生活费请在设置里填写，这里的收入只记额外收入，避免重复计算。
        </p>
        <div className="chips" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={type === "expense" ? "selected" : ""}
            aria-pressed={type === "expense"}
            onClick={() => changeType("expense")}
          >
            <IconOut size={15} />
            支出
          </button>
          <button
            type="button"
            className={type === "income" ? "selected" : ""}
            aria-pressed={type === "income"}
            onClick={() => changeType("income")}
          >
            <IconIn size={15} />
            收入
          </button>
        </div>
        <div className="field">
          <label htmlFor="amount">
            <IconWallet size={14} />
            金额（元）
          </label>
          <input
            id="amount"
            ref={amountRef}
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="例如 12 或 12.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => setAmount((v) => normalizeYuanInput(v))}
          />
        </div>
        <div className="field">
          <label>
            <IconTag size={14} />
            分类
          </label>
          <div className="chips">
            {cats.map((c) => (
              <button
                type="button"
                key={c.id}
                className={category === c.id ? "selected" : ""}
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
              >
                <CategoryIcon id={c.id} size={15} />
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="date">
            <IconCalendar size={14} />
            日期
          </label>
          <input
            id="date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value || todayISO())}
          />
        </div>
        <div className="field">
          <label htmlFor="note">
            <IconNote size={14} />
            备注（可选）
          </label>
          <input
            id="note"
            maxLength={80}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="可写商家或用途"
          />
        </div>
        {error ? (
          <p className="error" ref={errorRef} role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            <IconClose size={15} />
            取消
          </button>
          <button type="submit" className="btn primary">
            <IconSave size={15} />
            保存
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
