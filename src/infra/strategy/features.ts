import type { NormalizedBar } from "./ingest.js";

export interface FeatureConfig {
  id: string; // e.g. "anchored-vp"
  version: string; // semantic/hash
  params: Record<string, unknown>;
}

export interface FeatureFrame {
  ts: string;
  symbol: string;
  venue: string;
  values: Record<string, number>;
  meta?: Record<string, unknown>;
}

export interface FeatureComputer {
  config: FeatureConfig;
  compute(bars: NormalizedBar[]): Promise<FeatureFrame[]>;
}

export function placeholderFeatureComputer(id: string): FeatureComputer {
  return {
    config: { id, version: "0.0.0", params: {} },
    async compute(bars: NormalizedBar[]) {
      return bars.map((bar) => ({ ts: bar.ts, symbol: bar.symbol, venue: bar.venue, values: {} }));
    },
  };
}

// Example anchored volume profile stub: returns empty values but preserves frame shape.
export class AnchoredVolumeProfileComputer implements FeatureComputer {
  config: FeatureConfig;
  constructor(params: { anchorLookback: number }) {
    this.config = { id: "anchored-vp", version: "0.0.1", params };
  }
  async compute(bars: NormalizedBar[]): Promise<FeatureFrame[]> {
    if (!bars.length) {return [];}
    const start = Math.max(0, bars.length - (this.config.params.anchorLookback as number));
    const slice = bars.slice(start);
    const min = Math.min(...slice.map((b) => b.low));
    const max = Math.max(...slice.map((b) => b.high));
    const bins = 24;
    const step = (max - min) / bins || 1;
    const hist = Array.from({ length: bins }, () => 0);
    slice.forEach((b) => {
      const idx = Math.min(bins - 1, Math.max(0, Math.floor((b.close - min) / step)));
      hist[idx] += b.volume;
    });
    const pocIndex = hist.indexOf(Math.max(...hist));
    const poc = min + pocIndex * step;
    return bars.map((bar) => ({
      ts: bar.ts,
      symbol: bar.symbol,
      venue: bar.venue,
      values: { poc, vah: max, val: min },
      meta: { bins, step },
    }));
  }
}

// Simple volatility/trend regime stub.
export class RegimeScoreComputer implements FeatureComputer {
  config: FeatureConfig = { id: "regime-score", version: "0.0.1", params: {} };
  async compute(bars: NormalizedBar[]): Promise<FeatureFrame[]> {
    const vols = bars.map((b) => b.high - b.low);
    const median =
      vols.length > 0 ? vols.slice().toSorted((a, b) => a - b)[Math.floor(vols.length / 2)] : 0;
    return bars.map((bar) => {
      const vol = bar.high - bar.low;
      const volScore = median ? vol / median : 1;
      return { ts: bar.ts, symbol: bar.symbol, venue: bar.venue, values: { volScore } };
    });
  }
}

// Basic ATR computer (Wilder's) with default period 14.
export class AtrComputer implements FeatureComputer {
  config: FeatureConfig;
  #period: number;
  constructor(period = 14) {
    this.#period = period;
    this.config = { id: "atr", version: "0.0.1", params: { period } };
  }
  async compute(bars: NormalizedBar[]): Promise<FeatureFrame[]> {
    if (bars.length === 0) {return [];}
    const frames: FeatureFrame[] = [];
    let prevClose = bars[0].close;
    const trs: number[] = [];
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const tr = Math.max(b.high - b.low, Math.abs(b.high - prevClose), Math.abs(b.low - prevClose));
      trs.push(tr);
      prevClose = b.close;
      const window = trs.slice(Math.max(0, trs.length - this.#period), trs.length);
      const atr = window.reduce((a, v) => a + v, 0) / window.length;
      frames.push({ ts: b.ts, symbol: b.symbol, venue: b.venue, values: { atr } });
    }
    return frames;
  }
}
