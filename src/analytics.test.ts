import { describe, expect, it } from "vitest";
import {
  appendEvent,
  computeMetrics,
  lastNDays,
  makeEvent,
  parseEvents,
  MAX_EVENTS,
  type AnalyticsEvent,
} from "./analytics";

function ev(
  name: AnalyticsEvent["name"],
  day: string,
  props: AnalyticsEvent["props"] = {},
): AnalyticsEvent {
  const base = makeEvent(name, props, new Date(`${day}T10:00:00`));
  return { ...base, day };
}

describe("parseEvents", () => {
  it("drops malformed events and keeps valid ones", () => {
    const good = ev("record_created", "2026-11-08");
    expect(
      parseEvents([
        good,
        null,
        { id: "x", name: "unknown_event", ts: 1, day: "2026-11-08", props: {} },
        { ...good, day: "not-a-date" },
      ]),
    ).toEqual([good]);
  });

  it("returns an empty list for non-array input", () => {
    expect(parseEvents({})).toEqual([]);
    expect(parseEvents(null)).toEqual([]);
  });
});

describe("appendEvent", () => {
  it("caps the log at MAX_EVENTS, keeping the newest", () => {
    let events: AnalyticsEvent[] = [];
    for (let i = 0; i < MAX_EVENTS + 20; i += 1) {
      events = appendEvent(events, ev("page_view", "2026-11-08", { n: i }));
    }
    expect(events).toHaveLength(MAX_EVENTS);
    expect(events[0].props.n).toBe(20);
    expect(events[MAX_EVENTS - 1].props.n).toBe(MAX_EVENTS + 19);
  });
});

describe("lastNDays", () => {
  it("returns 7 ascending days including today and crosses month boundary", () => {
    expect(lastNDays("2026-11-03", 7)).toEqual([
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });
});

describe("computeMetrics", () => {
  const today = "2026-11-08";

  it("north star counts distinct recording days inside the 7-day window", () => {
    const events = [
      ev("record_created", "2026-11-08"),
      ev("record_created", "2026-11-08"),
      ev("record_created", "2026-11-06"),
      ev("record_created", "2026-11-02"),
      ev("record_created", "2026-10-30"), // 窗口外
    ];
    const metrics = computeMetrics(events, today);
    expect(metrics.northStar).toBe(3);
    expect(metrics.last7).toHaveLength(7);
    expect(metrics.last7.find((d) => d.day === "2026-11-08")?.records).toBe(2);
  });

  it("builds an activation funnel that only lights up reached steps", () => {
    const events = [
      ev("app_open", "2026-11-08"),
      ev("settings_saved", "2026-11-08", { hasAllowance: true }),
      ev("record_created", "2026-11-08"),
    ];
    const { funnel } = computeMetrics(events, today);
    expect(funnel.map((s) => s.reached)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });

  it("ignores settings saves without an allowance for activation", () => {
    const events = [
      ev("settings_saved", "2026-11-08", { hasAllowance: false }),
    ];
    expect(computeMetrics(events, today).funnel[1].reached).toBe(false);
  });

  it("marks a return visit only when a later day exists", () => {
    const sameDay = [ev("app_open", "2026-11-08")];
    expect(computeMetrics(sameDay, today).returnedLater).toBe(false);
    const nextDay = [...sameDay, ev("app_open", "2026-11-09")];
    expect(computeMetrics(nextDay, "2026-11-09").returnedLater).toBe(true);
  });

  it("returns null rates when denominators are zero and computes guardrails otherwise", () => {
    expect(computeMetrics([], today).undoRate).toBeNull();
    expect(computeMetrics([], today).validationErrorRate).toBeNull();
    const events = [
      ev("record_created", "2026-11-08"),
      ev("record_deleted", "2026-11-08"),
      ev("delete_undone", "2026-11-08"),
      ev("validation_error", "2026-11-08"),
    ];
    const metrics = computeMetrics(events, today);
    expect(metrics.undoRate).toBe(1);
    expect(metrics.deleteRate).toBe(1);
    expect(metrics.validationErrorRate).toBe(0.5);
  });

  it("reports empty state without throwing", () => {
    const metrics = computeMetrics([], today);
    expect(metrics.northStar).toBe(0);
    expect(metrics.totalEvents).toBe(0);
    expect(metrics.firstDay).toBeNull();
  });
});
