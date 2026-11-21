import { useRef, useState } from "react";
import { track } from "../analytics";
import { currentMonthKey, isValidISODate, todayISO } from "../dates";
import { fenToYuanText, yuanTextToFenAllowZero } from "../money";
import {
  downloadTextFile,
  exportStateJson,
  importStateFromJson,
} from "../storage";
import type { AppState, Settings } from "../types";
import {
  IconCalendar,
  IconCheck,
  IconDownload,
  IconFood,
  IconGift,
  IconPiggy,
  IconSave,
  IconSettings,
  IconShield,
  IconStar,
  IconUpload,
  IconWallet,
  IconWarn,
} from "./Icons";

interface Props {
  settings: Settings;
  state: AppState;
  onSave: (settings: Settings) => void;
  onReplaceState: (state: AppState) => void;
}

export default function SettingsPanel({
  settings,
  state,
  onSave,
  onReplaceState,
}: Props) {
  const month = currentMonthKey();
  const fileRef = useRef<HTMLInputElement>(null);
  const [allowance, setAllowance] = useState(() => {
    const fen = settings.allowanceByMonth[month] ?? 0;
    return fen ? fenToYuanText(fen) : "";
  });
  const [nextDate, setNextDate] = useState(settings.nextAllowanceDate);
  const [dailyMeal, setDailyMeal] = useState(
    settings.dailyMealFen ? fenToYuanText(settings.dailyMealFen) : "",
  );
  const [unpaid, setUnpaid] = useState(
    settings.unpaidNecessaryFen ? fenToYuanText(settings.unpaidNecessaryFen) : "",
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");
  const [backupErr, setBackupErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const allowanceFen = yuanTextToFenAllowZero(allowance || "0");
    const dailyMealFen = yuanTextToFenAllowZero(dailyMeal || "0");
    const unpaidNecessaryFen = yuanTextToFenAllowZero(unpaid || "0");
    if (allowanceFen === null || dailyMealFen === null || unpaidNecessaryFen === null) {
      setError("金额请填写 0 或正数，最多两位小数。");
      setSaved(false);
      return;
    }
    if (nextDate && !isValidISODate(nextDate)) {
      setError("到账日期无效。");
      setSaved(false);
      return;
    }
    if (nextDate && nextDate < todayISO()) {
      setError("到账日期已过期，请改为今天或之后的日期。");
      setSaved(false);
      return;
    }
    onSave({
      ...settings,
      allowanceByMonth: {
        ...settings.allowanceByMonth,
        [month]: allowanceFen,
      },
      nextAllowanceDate: nextDate,
      dailyMealFen,
      unpaidNecessaryFen,
    });
    setError("");
    setSaved(true);
  }

  function handleExport() {
    const stamp = todayISO();
    downloadTextFile(`stu-budget-backup-${stamp}.json`, exportStateJson(state));
    setBackupErr("");
    setBackupMsg("已导出备份文件，请妥善保存到手机或云盘。");
    track("backup_exported");
  }

  async function handleImportFile(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const next = importStateFromJson(text);
      const ok = window.confirm(
        `将用备份覆盖当前本机数据（账单 ${next.transactions.length} 条）。此操作不可自动撤销，是否继续？`,
      );
      if (!ok) return;
      onReplaceState(next);
      setBackupErr("");
      setBackupMsg(`已导入备份（${next.transactions.length} 条账单）。`);
      track("backup_imported");
    } catch (err) {
      setBackupMsg("");
      setBackupErr(err instanceof Error ? err.message : "导入失败，请检查文件。");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <form className="card" onSubmit={submit}>
        <div className="section-head">
          <h2>
            <IconSettings size={18} />
            预算与预测设置
          </h2>
          <span className="chip">
            <IconStar size={12} />
            本月
          </span>
        </div>
        <p className="note">
          <IconPiggy size={14} />
          当月生活费会计入预算，不要再把它记成收入。
        </p>
        <div className="field">
          <label htmlFor="allowance">
            <IconWallet size={14} />
            当月生活费总额（元）
          </label>
          <input
            id="allowance"
            inputMode="decimal"
            value={allowance}
            onChange={(e) => setAllowance(e.target.value)}
            placeholder="例如 1500"
          />
        </div>
        <div className="field">
          <label htmlFor="nextDate">
            <IconCalendar size={14} />
            下次生活费到账日期
          </label>
          <input
            id="nextDate"
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="meal">
            <IconFood size={14} />
            平均每天预计餐费（元）
          </label>
          <input
            id="meal"
            inputMode="decimal"
            value={dailyMeal}
            onChange={(e) => setDailyMeal(e.target.value)}
            placeholder="例如 35"
          />
        </div>
        <div className="field">
          <label htmlFor="unpaid">
            <IconWarn size={14} />
            到账前其他尚未支付的必要费用（元）
          </label>
          <input
            id="unpaid"
            inputMode="decimal"
            value={unpaid}
            onChange={(e) => setUnpaid(e.target.value)}
            placeholder="例如房租、网费"
          />
        </div>
        <p className="note">
          必要费用支付并记账后，请把这里的金额改小或改为 0，避免同时算进已支出和未来预留。
        </p>
        {error ? (
          <p className="error">
            <IconWarn size={14} />
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="ok">
            <IconCheck size={14} />
            设置已保存。
          </p>
        ) : null}
        <button className="btn primary" type="submit">
          <IconSave size={16} />
          保存设置
        </button>
      </form>

      <section className="card backup-card">
        <div className="section-head">
          <h2>
            <IconShield size={18} />
            数据备份
          </h2>
          <span className="chip">
            <IconGift size={12} />
            本地 JSON
          </span>
        </div>
        <p className="note">
          <IconShield size={14} />
          导出可带走全部设置与账单；换手机或清浏览器前建议先导出。导入会覆盖当前本机数据。
        </p>
        <div className="backup-actions">
          <button type="button" className="btn primary" onClick={handleExport}>
            <IconDownload size={16} />
            导出备份
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => fileRef.current?.click()}
          >
            <IconUpload size={16} />
            导入备份
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void handleImportFile(e.target.files?.[0])}
          />
        </div>
        {backupMsg ? (
          <p className="ok">
            <IconCheck size={14} />
            {backupMsg}
          </p>
        ) : null}
        {backupErr ? (
          <p className="error">
            <IconWarn size={14} />
            {backupErr}
          </p>
        ) : null}
      </section>
    </>
  );
}
