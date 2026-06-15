import { describe, expect, it } from "vitest";
import { savingsPercent } from "./format";

describe("savingsPercent", () => {
  it("returns rounded percent off old price", () => {
    expect(savingsPercent(75, 100)).toBe(25);
    expect(savingsPercent(10, 35)).toBe(71);
  });

  it("returns 0 when old price is zero", () => {
    expect(savingsPercent(10, 0)).toBe(0);
  });
});
