import type { PriceBar, Timeframe } from "../../strategy/spec.js";

export interface NormalizedBar extends PriceBar {
  bid?: number;
  ask?: number;
  venue: string;
  symbol: string;
  assetClass: string;
}

export interface IngestSourceConfig {
  id: string; // e.g. "dukascopy", "binance"
  venues: string[];
  supportsTimeframes: Timeframe[];
  supportsOrderBook?: boolean;
}

export interface IngestResult {
  bars: NormalizedBar[];
  errors?: string[];
  warnings?: string[];
  nextPage?: string;
}

export interface Ingestor {
  readonly config: IngestSourceConfig;
  fetchBars(params: {
    symbol: string;
    venue?: string;
    timeframe: Timeframe;
    start: string; // ISO UTC
    end: string; // ISO UTC
    limit?: number;
    page?: string;
  }): Promise<IngestResult>;
}

export interface DataQualityIssue {
  type: "gap" | "outlier" | "stale" | "timezone";
  description: string;
  start?: string;
  end?: string;
}

export interface QualityCheckResult {
  ok: boolean;
  issues: DataQualityIssue[];
}

export function runQualityChecks(bars: NormalizedBar[]): QualityCheckResult {
  if (bars.length === 0) {return { ok: true, issues: [] };}
  const issues: DataQualityIssue[] = [];

  // Gap detection: consecutive timestamps too far apart for 1st bar spacing heuristic.
  const ts = bars.map((b) => new Date(b.ts).getTime()).toSorted((a, b) => a - b);
  const deltas = ts.slice(1).map((t, i) => t - ts[i]);
  const median =
    deltas.length > 0
      ? deltas.toSorted((a, b) => a - b)[Math.floor(deltas.length / 2)]
      : 0;
  deltas.forEach((delta, idx) => {
    if (median && delta > median * 5) {
      issues.push({
        type: "gap",
        description: `gap ${delta}ms around index ${idx}`,
      });
    }
  });

  // Outlier clamp: price jumps >20x median range flagged.
  const ranges = bars.map((b) => b.high - b.low);
  const medRange =
    ranges.length > 0
      ? ranges.toSorted((a, b) => a - b)[Math.floor(ranges.length / 2)]
      : 0;
  if (medRange > 0) {
    bars.forEach((b) => {
      const r = b.high - b.low;
      if (r > medRange * 20) {
        issues.push({ type: "outlier", description: `range outlier ${r} at ${b.ts}` });
      }
    });
  }

  return { ok: issues.length === 0, issues };
}
