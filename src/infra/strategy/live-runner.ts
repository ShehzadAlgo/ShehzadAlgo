import type { StrategySpec, LiveSignal } from "../../strategy/spec.js";
import type { Ingestor } from "./ingest.js";
import type { FeatureProvider } from "./backtest-engine.js";

/**
 * Lightweight live signal runner: pulls recent bars once and emits a signal if entry rules match.
 * This is a scaffold; replace with streaming + position tracking for production.
 */
export class PollingLiveRunner {
  #timer?: NodeJS.Timeout;
  #position: { side: "long" | "short"; entry: number } | null = null;
  #lastError?: string;
  #lastFetchTs?: string;
  #backoffMs = 30_000;

  constructor(
    private readonly ingestor: Ingestor,
    private readonly features: FeatureProvider,
    private readonly positionStore: PositionStore = new InMemoryPositionStore(),
  ) {}

  start(spec: StrategySpec, intervalMs = 30_000, onSignal?: (signal: LiveSignal) => void) {
    this.#backoffMs = intervalMs;
    const loop = async () => {
      await this.runOnce(spec, new Date(), (sig) => onSignal?.(sig));
      const delay = this.#lastError ? Math.min(this.#backoffMs * 2, 5 * 60_000) : intervalMs;
      this.#backoffMs = delay;
      this.#timer = setTimeout(loop, delay);
    };
    void loop();
  }

  stop() {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
    this.#backoffMs = 30_000;
  }

  async runOnce(spec: StrategySpec, now: Date, onSignal: (signal: LiveSignal) => void) {
    const end = now.toISOString();
    const start = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // last 1h window
    try {
      const { bars, errors } = await this.ingestor.fetchBars({
        symbol: spec.instrument.symbol,
        venue: spec.instrument.venue,
        timeframe: spec.timeframe,
        start,
        end,
        limit: 200,
      });
      if (errors?.length) {
        this.#lastError = errors.join("; ");
        return;
      }
      if (!bars?.length) {
        this.#lastError = "no bars";
        return;
      }
      this.#lastFetchTs = new Date().toISOString();

      const features = await this.features.compute(spec, bars);
      const idx = bars.length - 1;
      const entryOk = evaluateRules(spec.rules.entries, features, idx);
      const filterOk = spec.rules.filters ? evaluateRules(spec.rules.filters, features, idx) : true;
      const exitOk = spec.rules.exits ? evaluateRules(spec.rules.exits, features, idx) : false;

      // restore position per spec
      this.#position = this.#position ?? this.positionStore.get(spec.id ?? spec.name) ?? null;

      // Track simple position to avoid spamming entry signals
      if (!this.#position && entryOk && filterOk && !exitOk) {
        const bar = bars[idx];
        const signal: LiveSignal = {
          specId: spec.id ?? spec.name,
          dataVersion: "live",
          signal: "entry",
          side: "long",
          price: bar.close,
          size: 0,
          timestamp: bar.ts,
          healthFlags: this.#healthFlags(),
        };
        onSignal(signal);
        this.#position = { side: "long", entry: bar.close };
        this.positionStore.set(spec.id ?? spec.name, this.#position);
      } else if (this.#position && exitOk) {
        const bar = bars[idx];
        const signal: LiveSignal = {
          specId: spec.id ?? spec.name,
          dataVersion: "live",
          signal: "exit",
          side: this.#position.side,
          price: bar.close,
          size: 0,
          timestamp: bar.ts,
          healthFlags: this.#healthFlags(),
        };
        onSignal(signal);
        this.#position = null;
        this.positionStore.clear(spec.id ?? spec.name);
      }
    } catch (err) {
      this.#lastError = (err as Error).message;
    }
  }

  #healthFlags(): string[] {
    const flags: string[] = [];
    if (this.#lastError) {flags.push(`error:${this.#lastError}`);}
    if (this.#lastFetchTs) {
      const ageMs = Date.now() - new Date(this.#lastFetchTs).getTime();
      if (ageMs > 120_000) {flags.push("stale-data");}
    }
    return flags;
  }
}

export interface PositionStore {
  get(specId: string): { side: "long" | "short"; entry: number } | null;
  set(specId: string, position: { side: "long" | "short"; entry: number }): void;
  clear(specId: string): void;
}

export class InMemoryPositionStore implements PositionStore {
  #map = new Map<string, { side: "long" | "short"; entry: number }>();
  get(specId: string) {
    return this.#map.get(specId) ?? null;
  }
  set(specId: string, position: { side: "long" | "short"; entry: number }) {
    this.#map.set(specId, position);
  }
  clear(specId: string) {
    this.#map.delete(specId);
  }
}

function evaluateRules(
  rules: StrategySpec["rules"]["entries"],
  features: Record<string, { values: Record<string, number> }[]>,
  idx: number,
): boolean {
  if (!rules?.length) {return false;}
  return rules.every((rule) => {
    const series = features[rule.indicator] ?? [];
    const frame = series[idx];
    if (!frame) {return false;}
    const lhs = frame.values[rule.operands[0]];
    const rhs =
      typeof rule.threshold === "number"
        ? rule.threshold
        : frame.values[rule.operands[1]] ?? rule.range?.[0];
    if (lhs === undefined) {return false;}
    switch (rule.comparator) {
      case "gt":
        return lhs > rhs;
      case "gte":
        return lhs >= rhs;
      case "lt":
        return lhs < rhs;
      case "lte":
        return lhs <= rhs;
      case "equals":
        return lhs === rhs;
      case "insideRange":
        return rule.range ? lhs >= rule.range[0] && lhs <= rule.range[1] : false;
      case "outsideRange":
        return rule.range ? lhs < rule.range[0] || lhs > rule.range[1] : false;
      case "crossesAbove":
      case "crossesBelow": {
        const prev = series[idx - 1];
        if (!prev) {return false;}
        const lhsPrev = prev.values[rule.operands[0]];
        const rhsPrev =
          typeof rule.threshold === "number" ? rule.threshold : prev.values[rule.operands[1]];
        if (lhsPrev === undefined || rhsPrev === undefined) {return false;}
        return rule.comparator === "crossesAbove"
          ? lhsPrev <= rhsPrev && lhs > rhs
          : lhsPrev >= rhsPrev && lhs < rhs;
      }
      default:
        return false;
    }
  });
}
