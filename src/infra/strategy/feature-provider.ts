import type { StrategySpec } from "../../strategy/spec.js";
import type { PriceBar } from "../../strategy/spec.js";
import type { FeatureFrame } from "./features.js";
import {
  AnchoredVolumeProfileComputer,
  ImbalanceFeature,
  MarketStructureFeature,
  RegimeScoreComputer,
  SessionTagFeature,
  AtrComputer,
} from "./index.js";

export class DefaultFeatureProvider {
  async compute(spec: StrategySpec, bars: PriceBar[]): Promise<Record<string, FeatureFrame[]>> {
    const results: Record<string, FeatureFrame[]> = {};
    const tasks = [
      { id: "anchored-vp", run: new AnchoredVolumeProfileComputer({ anchorLookback: 200 }).compute(bars as any) },
      { id: "imbalance", run: new ImbalanceFeature().compute(bars as any) },
      { id: "structure", run: new MarketStructureFeature({ lookback: 5 }).compute(bars as any) },
      { id: "regime", run: new RegimeScoreComputer().compute(bars as any) },
      { id: "session", run: new SessionTagFeature().compute(bars as any) },
      { id: "atr", run: new AtrComputer().compute(bars as any) },
    ];
    await Promise.all(
      tasks.map(async (t) => {
        results[t.id] = await t.run;
      }),
    );
    return results;
  }
}
