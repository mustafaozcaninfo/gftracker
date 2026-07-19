import { describe, expect, it } from "vitest";
import { formatDate, parseQatarInstant, savingsPercent } from "./format";

describe("savingsPercent", () => {
  it("returns rounded percent off old price", () => {
    expect(savingsPercent(75, 100)).toBe(25);
    expect(savingsPercent(10, 35)).toBe(71);
  });

  it("returns 0 when old price is zero", () => {
    expect(savingsPercent(10, 0)).toBe(0);
  });
});

describe("parseQatarInstant", () => {
  it("treats naive datetimes as Qatar local (+03)", () => {
    const d = parseQatarInstant("2026-06-15T07:38:48");
    expect(d.toISOString()).toBe("2026-06-15T04:38:48.000Z");
  });

  it("preserves explicit Z timestamps", () => {
    const d = parseQatarInstant("2026-06-15T07:38:48Z");
    expect(d.toISOString()).toBe("2026-06-15T07:38:48.000Z");
  });

  it("formats naive timestamps without host-TZ shift", () => {
    const label = formatDate("2026-06-15T07:38:48");
    expect(label).toContain("15");
    expect(label).toMatch(/07:38|7:38/);
  });
});
