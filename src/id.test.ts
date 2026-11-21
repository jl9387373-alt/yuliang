import { describe, expect, it } from "vitest";
import { createId } from "./id";

describe("createId", () => {
  it("returns a non-empty unique-ish string", () => {
    const a = createId();
    const b = createId();
    expect(a.length).toBeGreaterThan(8);
    expect(b.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });
});
