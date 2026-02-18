import type { FeatureComputer, FeatureConfig, FeatureFrame } from "../features.js";
import type { NormalizedBar } from "../ingest.js";

/**
 * AnchoredVolumeProfile
 * - Builds an anchored volume profile over the last `anchorLookback` bars.
 * - Distributes each bar's `volume` pro-rata across price bins covering the bar's [low, high].
 * - Computes POC (bin with max volume) and VAH/VAL that contain `valueAreaPct` of total volume
 *   around the POC (default 0.7).
 *
 * Params:
 * - anchorLookback: number of bars to anchor the profile to
 * - bins: number of price bins (default 24)
 * - valueAreaPct: fraction of total volume to include in the value area around POC (default 0.7)
 */
export class AnchoredVolumeProfile implements FeatureComputer {
  config: FeatureConfig;
  #anchorLookback: number;
  #bins: number;
  #valueAreaPct: number;

  constructor(params: { anchorLookback: number; bins?: number; valueAreaPct?: number }) {
    this.#anchorLookback = params.anchorLookback;
    this.#bins = params.bins ?? 24;
    this.#valueAreaPct = params.valueAreaPct ?? 0.7;
    this.config = { id: "anchored-vp", version: "0.2.0", params };
  }

  async compute(bars: NormalizedBar[]): Promise<FeatureFrame[]> {
    if (!bars.length) return [];
    const start = Math.max(0, bars.length - this.#anchorLookback);
    const slice = bars.slice(start);

    const min = Math.min(...slice.map((b) => b.low));
    const max = Math.max(...slice.map((b) => b.high));

    // Handle zero-range (all bars have same price)
    if (min === max) {
      const pocPrice = min;
      return bars.map((b) => ({
        ts: b.ts,
        symbol: b.symbol,
        venue: b.venue,
        values: { poc: pocPrice, vah: max, val: min },
        meta: { bins: this.#bins, step: 0 },
      }));
    }

    const bins = Math.max(1, Math.floor(this.#bins));
    const step = (max - min) / bins;

    // Precompute bin ranges
    const binRanges: Array<{ lo: number; hi: number }> = Array.from({ length: bins }, (_, i) => {
      const lo = min + i * step;
      const hi = i === bins - 1 ? max : lo + step;
      return { lo, hi };
    });

    const histogram = new Array<number>(bins).fill(0);

    // Distribute each bar's volume across bins proportional to overlap
    for (const b of slice) {
      // If bar has zero height, assign all volume to the bin containing its close (or low)
      if (b.high <= b.low) {
        const idx = Math.min(bins - 1, Math.max(0, Math.floor((b.close - min) / step)));
        histogram[idx] += b.volume;
        continue;
      }

      const barLo = Math.max(b.low, min);
      const barHi = Math.min(b.high, max);
      const barRange = barHi - barLo;
      if (barRange <= 0) continue;

      // For each bin that overlaps the bar, add proportional volume
      // Note: iterate bins and compute overlap; bins count is small (default 24)
      for (let i = 0; i < bins; i++) {
        const { lo, hi } = binRanges[i];
        const overlapLo = Math.max(lo, barLo);
        const overlapHi = Math.min(hi, barHi);
        const overlap = Math.max(0, overlapHi - overlapLo);
        if (overlap > 0) {
          histogram[i] += b.volume * (overlap / barRange);
        }
      }
    }

    // Find POC index and price (center of bin)
    let maxVol = -Infinity;
    let pocIndex = 0;
    for (let i = 0; i < bins; i++) {
      const v = histogram[i];
      if (v > maxVol) {
        maxVol = v;
        pocIndex = i;
      }
    }
    const pocPrice = binRanges[pocIndex].lo + (binRanges[pocIndex].hi - binRanges[pocIndex].lo) / 2;

    // Compute VAH/VAL by accumulating volume around POC until valueAreaPct is reached
    const totalVol = histogram.reduce((s, v) => s + v, 0) || 0;
    const target = totalVol * this.#valueAreaPct;

    // Accumulate volumes starting from pocIndex expanding outwards
    let left = pocIndex;
    let right = pocIndex;
    let acc = histogram[pocIndex];

    while (acc < target && (left > 0 || right < bins - 1)) {
      const leftVol = left > 0 ? histogram[left - 1] : -Infinity;
      const rightVol = right < bins - 1 ? histogram[right + 1] : -Infinity;
      if (leftVol >= rightVol) {
        left -= 1;
        acc += histogram[left];
      } else {
        right += 1;
        acc += histogram[right];
      }
    }

    const val = binRanges[left].lo;
    const vah = binRanges[right].hi;

    return bars.map((b) => ({
      ts: b.ts,
      symbol: b.symbol,
      venue: b.venue,
      values: { poc: pocPrice, vah, val },
      meta: { bins, step, pocIndex, left, right, totalVol },
    }));
  }
}
