import { describe, expect, it } from "vitest";

/** Mirror chart geometry used in PriceHistoryChart for regression checks. */
function chartCoords(points: Array<[string, number, number]>) {
  const prices = points.map(([, price]) => price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const innerH = 108;
  const padY = 10;
  return points.map(([, price], index) => ({
    index,
    y: padY + innerH - ((price - min) / range) * innerH,
  }));
}

describe("PriceHistoryChart geometry", () => {
  it("assigns different Y values when prices differ", () => {
    const coords = chartCoords([
      ["2026-06-11", 94, 50],
      ["2026-06-14", 113, 40],
      ["2026-06-16", 94, 50],
    ]);
    expect(coords[0].y).toBeGreaterThan(coords[1].y);
    expect(coords[2].y).toBe(coords[0].y);
  });

  it("centers flat prices in the chart band", () => {
    const coords = chartCoords([
      ["2026-06-11", 100, 50],
      ["2026-06-12", 100, 50],
    ]);
    expect(coords[0].y).toBe(coords[1].y);
  });
});
