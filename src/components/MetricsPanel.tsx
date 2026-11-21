import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import {
  computeMetrics,
  clearEvents,
  EVENT_LABELS,
  getEvents,
  subscribe,
  track,
} from "../analytics";
import { formatDateTime, todayISO } from "../dates";
import { downloadTextFile } from "../storage";
import "../metrics.css";
import {
  IconChart,
  IconCheck,
  IconClock,
  IconDownload,
  IconList,
  IconShield,
  IconSpark,
  IconTarget,
  IconTrash,
  IconWarn,
} from "./Icons";

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default function MetricsPanel() {
  const events = useSyncExternalStore(subscribe, getEvents, getEvents);
  const metrics = useMemo(() => computeMetrics(events), [events]);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("metrics_viewed");
  }, []);

  const recent = useMemo(() => [...events].reverse().slice(0, 12), [events]);
  const maxFunnel = Math.max(1, ...metrics.funnel.map((s) => s.count));
  const maxDay = Math.max(1, ...metrics.last7.map((d) => d.records));

  function handleExport() {
    downloadTextFile(
      `stu-budget-events-${todayISO()}.json`,
      `${JSON.stringify(
        {
          format: "stu-budget-events",
          version: 1,
          exportedAt: new Date().toISOString(),
          note: "仅含本机行为事件，不含金额与备注",
          events,
        },
        null,
        2,
      )}\n`,
    );
    track("events_exported");
  }

  function handleClear() {
    if (
      !window.confirm(
        "清空本机埋点日志？账单与预算设置不会受影响，但历史指标将无法恢复。",
      )
    ) {
      return;
    }
    clearEvents();
  }

  return (
    <>
      <section className="card pm-card">
        <div className="section-head">
          <h2>
            <IconTarget size={18} />
            北极星指标
          </h2>
          <span className="chip">
            <IconChart size={12} />
            过去 7 天
          </span>
        </div>
        <div className="pm-north">
          <div className="pm-north-value">
            <strong>{metrics.northStar}</strong>
            <span>/ 7 天</span>
          </div>
          <div className="pm-north-copy">
            <p className="pm-north-title">有效记账天数</p>
            <p className="note">
              过去 7 天里，有记账行为的自然日数量。预测依赖新鲜数据，用户不回来记，产品就失去价值，因此用它而不是「累计记账笔数」做北极星。
            </p>
            <p className={metrics.northStar >= metrics.northStarTarget ? "ok" : "warn"}>
              {metrics.northStar >= metrics.northStarTarget ? (
                <IconCheck size={14} />
              ) : (
                <IconWarn size={14} />
              )}
              原型期目标 ≥ {metrics.northStarTarget} 天 / 周
            </p>
          </div>
        </div>
        <div className="pm-week">
          {metrics.last7.map((d) => (
            <div className="pm-day" key={d.day}>
              <div className="pm-day-bar-wrap">
                <div
                  className="pm-day-bar"
                  style={{ height: `${Math.max(6, (d.records / maxDay) * 100)}%` }}
                />
              </div>
              <span>{d.day.slice(5)}</span>
              <small>{d.records}</small>
            </div>
          ))}
        </div>
        <p className="note pm-foot">
          <IconShield size={13} />
          单机口径：本机只有 1 位用户，指标用于观察使用行为与验证埋点链路，<strong>不能推断总体留存</strong>。跨用户指标需要服务端与匿名 ID 体系。
        </p>
      </section>

      <section className="card pm-card">
        <div className="section-head">
          <h2>
            <IconChart size={18} />
            激活漏斗
          </h2>
          <span className="chip">
            <IconSpark size={12} />
            打开 → 回访
          </span>
        </div>
        <div className="pm-funnel">
          {metrics.funnel.map((step, index) => (
            <div className={`pm-funnel-row ${step.reached ? "is-reached" : ""}`} key={step.key}>
              <span className="pm-funnel-index">{index + 1}</span>
              <div className="pm-funnel-body">
                <div className="pm-funnel-label">
                  <strong>{step.label}</strong>
                  <span>{step.hint}</span>
                  <em>{step.count} 次</em>
                </div>
                <div className="pm-funnel-track">
                  <div
                    className="pm-funnel-fill"
                    style={{ width: `${(step.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </div>
              <span className="pm-funnel-mark">
                {step.reached ? <IconCheck size={15} /> : "—"}
              </span>
            </div>
          ))}
        </div>
        <p className="note pm-foot">
          <IconChart size={13} />
          单机漏斗看「步骤是否走通 + 触发次数」，不是按用户数算转化率。哪一步没点亮，就是下一轮需求该去查的流失点，见 `需求池与迭代路线.md`。
        </p>
      </section>

      <section className="card pm-card">
        <div className="section-head">
          <h2>
            <IconSpark size={18} />
            关键指标与护栏
          </h2>
          <span className="chip">
            <IconClock size={12} />
            累计 {metrics.totalEvents} 条事件
          </span>
        </div>
        <div className="pm-grid">
          <div>
            <span className="metric-label">累计记账</span>
            <p className="metric-value">{metrics.recordsCreated}</p>
          </div>
          <div>
            <span className="metric-label">活跃天数</span>
            <p className="metric-value">{metrics.activeDays}</p>
          </div>
          <div>
            <span className="metric-label">隔天回访</span>
            <p className={`metric-value ${metrics.returnedLater ? "positive" : ""}`}>
              {metrics.returnedLater ? "已发生" : "未发生"}
            </p>
          </div>
          <div>
            <span className="metric-label">校验失败率</span>
            <p className="metric-value">{percent(metrics.validationErrorRate)}</p>
          </div>
          <div>
            <span className="metric-label">删除率</span>
            <p className="metric-value">{percent(metrics.deleteRate)}</p>
          </div>
          <div>
            <span className="metric-label">撤销率</span>
            <p className="metric-value">{percent(metrics.undoRate)}</p>
          </div>
        </div>
        <p className="note pm-foot">
          护栏指标用于防止「为了提数据而伤害体验」：引导变多会抬高校验失败率，误删变多会抬高删除率；分母为 0 时显示「—」，不假造 0%。
        </p>
      </section>

      <section className="card pm-card">
        <div className="section-head">
          <h2>
            <IconList size={18} />
            事件日志
          </h2>
          <span className="chip">
            <IconShield size={12} />
            仅本机 · 不含金额
          </span>
        </div>
        {recent.length ? (
          <div className="pm-log">
            {recent.map((e) => (
              <div className="pm-log-row" key={e.id}>
                <span>{formatDateTime(e.ts)}</span>
                <strong>{EVENT_LABELS[e.name]}</strong>
                <em>
                  {Object.entries(e.props)
                    .map(([k, v]) => `${k}=${String(v)}`)
                    .join(" · ") || "—"}
                </em>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">还没有事件。去首页记一笔，这里就会出现数据。</p>
        )}
        <div className="backup-actions pm-actions">
          <button type="button" className="btn primary" onClick={handleExport}>
            <IconDownload size={16} />
            导出事件日志
          </button>
          <button type="button" className="btn ghost" onClick={handleClear}>
            <IconTrash size={16} />
            清空埋点数据
          </button>
        </div>
        <p className="note pm-foot">
          <IconShield size={13} />
          事件只记录动作类型、时间与页面/收支类型等非敏感属性，不采集金额、备注与自由文本；日志仅存本机 localStorage（最多 500 条，超出自动裁剪），不上传网络。清空只影响埋点，不会动账单与设置。
        </p>
      </section>
    </>
  );
}
