import { describe, expect, it } from "vitest";
import {
  EXPORT_FORMAT,
  buildExportPayload,
  exportStateJson,
  importStateFromJson,
  parseAppState,
} from "./storage";
import { defaultState } from "./types";

describe("backup import/export", () => {
  it("round-trips state through JSON backup", () => {
    const state = defaultState();
    state.settings.dailyMealFen = 3500;
    state.transactions.push({
      id: "t1",
      type: "expense",
      amountFen: 1200,
      category: "food",
      date: "2026-10-11",
      note: "",
      createdAt: 1,
    });

    const json = exportStateJson(state);
    const restored = importStateFromJson(json);
    expect(restored.settings.dailyMealFen).toBe(3500);
    expect(restored.transactions).toHaveLength(1);
    expect(restored.transactions[0]?.amountFen).toBe(1200);
  });

  it("accepts raw AppState JSON as well as wrapped backup", () => {
    const state = defaultState();
    expect(parseAppState(state)).not.toBeNull();
    expect(parseAppState(buildExportPayload(state))?.settings).toEqual(state.settings);
    expect(buildExportPayload(state).format).toBe(EXPORT_FORMAT);
  });

  it("rejects invalid backup", () => {
    expect(() => importStateFromJson('{"foo":1}')).toThrow(/格式无效/);
  });
});

function validState() {
  const state = defaultState();
  state.settings = {
    allowanceByMonth: { "2026-11": 150000 },
    nextAllowanceDate: "2026-12-10",
    dailyMealFen: 3500,
    unpaidNecessaryFen: 5000,
  };
  state.transactions = [
    {
      id: "t1",
      type: "expense",
      amountFen: 1200,
      category: "food",
      date: "2026-11-20",
      note: "食堂",
      createdAt: 1,
    },
  ];
  return state;
}

function wrapped(state: unknown): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, data: state });
}

describe("strict backup validation", () => {
  it("rejects invalid transaction rows", () => {
    const base = validState();
    const badRows = [
      { ...base.transactions[0], category: "foo" },
      { ...base.transactions[0], type: "income" },
      { ...base.transactions[0], date: "2026-02-30" },
      { ...base.transactions[0], note: "x".repeat(81) },
      { ...base.transactions[0], amountFen: 0 },
    ];
    for (const row of badRows) {
      expect(() =>
        importStateFromJson(wrapped({ ...base, transactions: [row] })),
      ).toThrow(/第 1 条账单/);
    }
  });

  it("rejects invalid settings", () => {
    const base = validState();
    const badSettings = [
      { ...base.settings, allowanceByMonth: { "2026-11": "abc" } },
      { ...base.settings, allowanceByMonth: { "2026-13": 100 } },
      { ...base.settings, dailyMealFen: -1 },
      { ...base.settings, nextAllowanceDate: "2026-02-30" },
    ];
    for (const settings of badSettings) {
      expect(() => importStateFromJson(wrapped({ ...base, settings }))).toThrow(
        /设置字段无效/,
      );
    }
  });

  it("rejects duplicate ids and newer backup versions", () => {
    const base = validState();
    expect(() =>
      importStateFromJson(
        wrapped({
          ...base,
          transactions: [base.transactions[0], { ...base.transactions[0] }],
        }),
      ),
    ).toThrow(/重复/);
    expect(() =>
      importStateFromJson(
        JSON.stringify({ format: EXPORT_FORMAT, version: 2, data: base }),
      ),
    ).toThrow(/版本/);
  });

  it("drops bad rows but keeps valid ones when reading local state", () => {
    const base = validState();
    const parsed = parseAppState({
      ...base,
      transactions: [
        base.transactions[0],
        { ...base.transactions[0], id: "t2", category: "foo" },
      ],
    });
    expect(parsed?.transactions).toHaveLength(1);
    expect(parsed?.transactions[0]?.id).toBe("t1");
  });
});
