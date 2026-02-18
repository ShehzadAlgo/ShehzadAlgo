import { test, expect } from "vitest";
import { AnchoredVolumeProfile } from "./volume-profile";

test("zero-range bars return single price for poc/vah/val", async () => {
  const bars = [
    { ts: "2026-01-01T00:00:00Z", open: 100, high: 100, low: 100, close: 100, volume: 10, venue: "X", symbol: "TST" },
    { ts: "2026-01-01T00:01:00Z", open: 100, high: 100, low: 100, close: 100, volume: 5, venue: "X", symbol: "TST" },
  ];

  const vp = new AnchoredVolumeProfile({ anchorLookback: 10, bins: 8 });
  const frames = await vp.compute(bars as any);
  expect(frames.length).toBe(2);
  for (const f of frames) {
    expect(f.values.poc).toBeCloseTo(100, 8);
    expect(f.values.val).toBeCloseTo(100, 8);
    expect(f.values.vah).toBeCloseTo(100, 8);
    expect(f.meta.step).toBe(0);
  }
});

test("valueAreaPct=1 returns full profile range (val=min, vah=max)", async () => {
  const bars = [
    { ts: "2026-01-01T00:00:00Z", open: 0, high: 1, low: 0, close: 0.5, volume: 10, venue: "X", symbol: "TST" },
    { ts: "2026-01-01T00:01:00Z", open: 1, high: 2, low: 1, close: 1.5, volume: 20, venue: "X", symbol: "TST" },
    { ts: "2026-01-01T00:02:00Z", open: 2, high: 3, low: 2, close: 2.5, volume: 30, venue: "X", symbol: "TST" },
  ];

  const vp = new AnchoredVolumeProfile({ anchorLookback: 3, bins: 3, valueAreaPct: 1 });
  const frames = await vp.compute(bars as any);
  const f = frames[0];
  expect(f.values.val).toBeCloseTo(0, 6);
  expect(f.values.vah).toBeCloseTo(3, 6);
});

test("zero-height bar assigned to bin of its close", async () => {
  const bars = [
    { ts: "2026-01-01T00:00:00Z", open: 0, high: 1, low: 0, close: 0.5, volume: 1, venue: "X", symbol: "TST" },
    { ts: "2026-01-01T00:01:00Z", open: 2, high: 2, low: 2, close: 2, volume: 100, venue: "X", symbol: "TST" },
    { ts: "2026-01-01T00:02:00Z", open: 3, high: 4, low: 3, close: 3.5, volume: 1, venue: "X", symbol: "TST" },
  ];

  const vp = new AnchoredVolumeProfile({ anchorLookback: 3, bins: 4 });
  const frames = await vp.compute(bars as any);
  const f = frames[0];
  // The large zero-height bar at close=2 should drive the POC to the bin containing 2
  expect(f.values.poc).toBeGreaterThanOrEqual(2);
  expect(f.meta.totalVol).toBeGreaterThan(100);
});

test("anchorLookback respects last N bars only", async () => {
  const bars = [
    { ts: "t1", open: 0, high: 1, low: 0, close: 0.5, volume: 1, venue: "X", symbol: "TST" },
    { ts: "t2", open: 1, high: 2, low: 1, close: 1.5, volume: 2, venue: "X", symbol: "TST" },
    { ts: "t3", open: 2, high: 3, low: 2, close: 2.5, volume: 3, venue: "X", symbol: "TST" },
    { ts: "t4", open: 3, high: 4, low: 3, close: 3.5, volume: 100, venue: "X", symbol: "TST" },
  ];

  const vp = new AnchoredVolumeProfile({ anchorLookback: 2, bins: 4 });
  const frames = await vp.compute(bars as any);
  const meta = frames[0].meta;
  // totalVol should equal volumes of last two bars (3 + 100)
  expect(Math.round(meta.totalVol)).toBe(103);
});
