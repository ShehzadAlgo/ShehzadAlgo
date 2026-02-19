import type { FeatureComputer, FeatureConfig, FeatureFrame } from "../features.js";
import type { NormalizedBar } from "../ingest.js";

// Simple buy/sell imbalance proxy using close position in bar range.
export class ImbalanceFeature implements FeatureComputer {
  config: FeatureConfig = { id: "imbalance", version: "0.1.0", params: {} };
  async compute(bars: NormalizedBar[]): Promise<FeatureFrame[]> {
    return bars.map((b) => {
      const range = b.high - b.low || 1;
      const rel = (b.close - b.low) / range;
      const imbalance = (rel - 0.5) * 200; // -100..100
      return { ts: b.ts, symbol: b.symbol, venue: b.venue, values: { imbalance } } satisfies FeatureFrame;
    });
  }
}
