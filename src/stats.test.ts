import { describe, expect, it } from "vitest";
import { computeForecast, summarizeMonth } from "./stats";
import type { AppState } from "./types";

const baseState: AppState = {
  settings: {
    allowanceByMonth: { "2026-10": 150000 },
    nextAllowanceDate: "2026-11-01",
    dailyMealFen: 3500,
    unpaidNecessaryFen: 5000,
  },
  transactions: [
    {
      id: "e1",
      type: "expense",
      amountFen: 1200,
      category: "food",
      date: "2026-10-05",
      note: "食堂",
      createdAt: 1,
    },
    {
      id: "i1",
      type: "income",
      amountFen: 10000,
      category: "extra",
      date: "2026-10-06",
      note: "兼职",
      createdAt: 2,
    },
  ],
};

describe("summarizeMonth", () => {
  it("computes remaining as allowance + extra income - expense", () => {
    const summary = summarizeMonth(baseState, "2026-10");
    expect(summary.allowanceFen).toBe(150000);
    expect(summary.extraIncomeFen).toBe(10000);
    expect(summary.expenseFen).toBe(1200);
    // 1500 + 100 - 12 = 1588
    expect(summary.remainingFen).toBe(158800);
  });

  it("does not treat allowance as income transactions", () => {
    const summary = summarizeMonth(baseState, "2026-10");
    expect(summary.extraIncomeFen).toBe(10000);
    expect(summary.allowanceFen + summary.extraIncomeFen).toBe(160000);
  });
});

const carryState: AppState = {
  settings: {
    allowanceByMonth: { "2026-09": 100000, "2026-10": 150000 },
    nextAllowanceDate: "2026-11-15",
    dailyMealFen: 3000,
    unpaidNecessaryFen: 0,
  },
  transactions: [
    {
      id: "s1",
      type: "expense",
      amountFen: 20000,
      category: "food",
      date: "2026-09-10",
      note: "",
      createdAt: 1,
    },
    {
      id: "o1",
      type: "expense",
      amountFen: 30000,
      category: "food",
      date: "2026-10-02",
      note: "",
      createdAt: 2,
    },
    {
      id: "o2",
      type: "income",
      amountFen: 10000,
      category: "extra",
      date: "2026-10-03",
      note: "",
      createdAt: 3,
    },
  ],
};

describe("summarizeMonth carryover", () => {
  it("carries the previous month's leftover into the current month", () => {
    // 9 月 1000 - 200 = 800 结余；10 月 800 + 1500 + 100 - 300 = 2100
    const oct = summarizeMonth(carryState, "2026-10");
    expect(oct.carryoverFen).toBe(80000);
    expect(oct.remainingFen).toBe(210000);
  });

  it("accumulates leftover across several budgeted months", () => {
    // 11 月还没设生活费：结转 9 月 800 + 10 月 1300 = 2100，不再归零
    const nov = summarizeMonth(carryState, "2026-11");
    expect(nov.allowanceFen).toBe(0);
    expect(nov.carryoverFen).toBe(210000);
    expect(nov.remainingFen).toBe(210000);
  });

  it("skips months without a configured allowance", () => {
    const state: AppState = {
      settings: {
        allowanceByMonth: { "2026-10": 150000 },
        nextAllowanceDate: "",
        dailyMealFen: 0,
        unpaidNecessaryFen: 0,
      },
      transactions: [
        {
          id: "x1",
          type: "expense",
          amountFen: 5000,
          category: "food",
          date: "2026-09-10",
          note: "",
          createdAt: 1,
        },
      ],
    };
    const oct = summarizeMonth(state, "2026-10");
    expect(oct.carryoverFen).toBe(0);
    expect(oct.remainingFen).toBe(150000);
  });

  it("carries a negative balance forward as an overdraft", () => {
    const state: AppState = {
      settings: {
        allowanceByMonth: { "2026-09": 100000, "2026-10": 150000 },
        nextAllowanceDate: "",
        dailyMealFen: 0,
        unpaidNecessaryFen: 0,
      },
      transactions: [
        {
          id: "y1",
          type: "expense",
          amountFen: 120000,
          category: "food",
          date: "2026-09-10",
          note: "",
          createdAt: 1,
        },
      ],
    };
    const oct = summarizeMonth(state, "2026-10");
    expect(oct.carryoverFen).toBe(-20000);
    expect(oct.remainingFen).toBe(130000);
  });
});

describe("computeForecast", () => {
  it("returns missing when next date empty", () => {
    const f = computeForecast(10000, "", 3500, 0, "2026-10-10");
    expect(f.status).toBe("missing");
  });

  it("returns expired when next date is before today", () => {
    const f = computeForecast(10000, "2026-10-01", 3500, 0, "2026-10-10");
    expect(f.status).toBe("expired");
  });

  it("estimates need as days * meal + unpaid", () => {
    // from 2026-10-10 to 2026-10-20 = 10 days
    const f = computeForecast(100000, "2026-10-20", 3500, 5000, "2026-10-10");
    expect(f.status).toBe("ready");
    expect(f.remainingDays).toBe(10);
    expect(f.estimatedNeedFen).toBe(10 * 3500 + 5000);
    expect(f.leftoverFen).toBe(100000 - (10 * 3500 + 5000));
  });
});
