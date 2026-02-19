import type { FeatureComputer, FeatureConfig, FeatureFrame } from "../features.js";
import type { NormalizedBar } from "../ingest.js";

// Basic market structure detector: HH/HL/LH/LL flags and swing points using a lookback window.
export class MarketStructureFeature implements FeatureComputer {
  config: FeatureConfig;
  #lookback: number;
  constructor(params: { lookback: number }) {
    this.#lookback = params.lookback;
    this.config = { id: "market-structure", version: "0.1.0", params };
  }

  async compute(bars: NormalizedBar[]): Promise<FeatureFrame[]> {
    const frames: FeatureFrame[] = [];
    for (let i = 0; i < bars.length; i++) {
      const start = Math.max(0, i - this.#lookback);
      const slice = bars.slice(start, i + 1);
      const high = Math.max(...slice.map((b) => b.high));
      const low = Math.min(...slice.map((b) => b.low));
      const last = bars[i];
      const prev = bars[i - 1];
      let label = 0; // 1=HH, 2=HL, -1=LL, -2=LH
      if (prev) {
        if (last.high > prev.high && last.low > prev.low) {label = 1;} // HH
        else if (last.low > prev.low) {label = 2;} // HL
        else if (last.low < prev.low && last.high < prev.high) {label = -1;} // LL
        else if (last.high < prev.high) {label = -2;} // LH
      }
      frames.push({
        ts: last.ts,
        symbol: last.symbol,
        venue: last.venue,
        values: {
          swingHigh: high,
          swingLow: low,
          structureLabel: label,
        },
      });
    }
    return frames;
  }
}
