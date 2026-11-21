import { describe, expect, it } from "vitest";
import {
  fenToYuanText,
  formatYuan,
  normalizeYuanInput,
  yuanTextToFen,
  yuanTextToFenAllowZero,
} from "./money";

describe("yuanTextToFen", () => {
  it("parses common amounts to integer fen", () => {
    expect(yuanTextToFen("12")).toBe(1200);
    expect(yuanTextToFen("12.5")).toBe(1250);
    expect(yuanTextToFen("12.50")).toBe(1250);
    expect(yuanTextToFen("0.01")).toBe(1);
  });

  it("accepts mobile IME quirks", () => {
    expect(normalizeYuanInput("１２．５")).toBe("12.5");
    expect(yuanTextToFen("１２．５")).toBe(1250);
    expect(yuanTextToFen("12。5")).toBe(1250);
    expect(yuanTextToFen("¥12")).toBe(1200);
    expect(yuanTextToFen("12元")).toBe(1200);
    expect(yuanTextToFen("012")).toBe(1200);
    expect(yuanTextToFen("12.")).toBe(1200);
  });

  it("rejects zero, negatives, and invalid text", () => {
    expect(yuanTextToFen("0")).toBeNull();
    expect(yuanTextToFen("0.00")).toBeNull();
    expect(yuanTextToFen("-1")).toBeNull();
    expect(yuanTextToFen("12.345")).toBeNull();
    expect(yuanTextToFen("abc")).toBeNull();
    expect(yuanTextToFen("")).toBeNull();
  });
});

describe("yuanTextToFenAllowZero", () => {
  it("allows empty and zero for settings", () => {
    expect(yuanTextToFenAllowZero("")).toBe(0);
    expect(yuanTextToFenAllowZero("0")).toBe(0);
    expect(yuanTextToFenAllowZero("35")).toBe(3500);
  });
});

describe("fen formatting", () => {
  it("formats fen back to yuan text and display", () => {
    expect(fenToYuanText(150000)).toBe("1500.00");
    expect(fenToYuanText(-1200)).toBe("-12.00");
    expect(formatYuan(1250)).toBe("¥12.50");
    expect(formatYuan(-1550)).toBe("-¥15.50");
  });
});
