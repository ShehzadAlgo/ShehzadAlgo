import { test, expect } from "vitest";
import { AnchoredVolumeProfile } from "./volume-profile";

// Simple synthetic dataset: three adjacent non-overlapping bars where the
// middle bar contains almost all volume. With bins=3 and valueAreaPct=0.7
// the VAH/VAL should collapse to the middle bin [1,2].
test("AnchoredVolumeProfile basic pro-rata and VAH/VAL", async () => {
  const bars = [
    { ts: "2026-01-01T00:00:00Z", open: 0, high: 1, low: 0, close: 0.5, volume: 1, venue: "X", symbol: "TST" },
    { ts: "2026-01-01T00:01:00Z", open: 1, high: 2, low: 1, close: 1.5, volume: 100, venue: "X", symbol: "TST" },
    { ts: "2026-01-01T00:02:00Z", open: 2, high: 3, low: 2, close: 2.5, volume: 1, venue: "X", symbol: "TST" },
  ];

  const vp = new AnchoredVolumeProfile({ anchorLookback: 3, bins: 3, valueAreaPct: 0.7 });
  const frames = await vp.compute(bars as any);
  expect(frames.length).toBe(3);

  const f0 = frames[0];
  expect(f0.values.val).toBeCloseTo(1, 6);
  expect(f0.values.vah).toBeCloseTo(2, 6);
  // poc should be center of middle bin -> 1.5
  expect(f0.values.poc).toBeCloseTo(1.5, 6);
  // metadata totalVol should be approximately 102
  expect(f0.meta.totalVol).toBeGreaterThan(100);
});
