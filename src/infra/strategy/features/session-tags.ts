import type { FeatureComputer, FeatureConfig, FeatureFrame } from "../features.js";
import type { NormalizedBar } from "../ingest.js";

// Session tagger: encodes Asia/London/NY based on UTC hour; RTH placeholder for equities.
export class SessionTagFeature implements FeatureComputer {
  config: FeatureConfig = { id: "session-tag", version: "0.1.0", params: {} };
  async compute(bars: NormalizedBar[]): Promise<FeatureFrame[]> {
    return bars.map((b) => {
      const hour = new Date(b.ts).getUTCHours();
      // Rough session buckets
      const asia = hour >= 0 && hour < 8 ? 1 : 0;
      const london = hour >= 7 && hour < 15 ? 1 : 0;
      const ny = hour >= 12 && hour < 21 ? 1 : 0;
      return {
        ts: b.ts,
        symbol: b.symbol,
        venue: b.venue,
        values: { session_asia: asia, session_london: london, session_ny: ny },
      } satisfies FeatureFrame;
    });
  }
}
