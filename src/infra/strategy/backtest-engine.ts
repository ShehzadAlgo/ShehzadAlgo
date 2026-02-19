import type {
  BacktestRequest,
  BacktestResult,
  PriceBar,
  StrategySpec,
} from "../../strategy/spec.js";
import { SimpleBacktester, computeMaxDrawdown, computeProfitFactor } from "./backtest.js";
import type { FeatureFrame } from "./features.js";
import { FilePersistence } from "./file-persistence.js";

export interface FeatureProvider {
  compute(spec: StrategySpec, bars: PriceBar[]): Promise<Record<string, FeatureFrame[]>>;
}

export class RuleBasedBacktester {
  constructor(
    private readonly featureProvider: FeatureProvider,
    private readonly persistence: Persistence = new FilePersistence(),
  ) {}

  async run(request: BacktestRequest): Promise<BacktestResult> {
    const bars = request.bars ?? [];
    if (!bars.length) {
      return new SimpleBacktester().run(request);
    }

    const features = await this.featureProvider.compute(request.spec, bars);
    const equityCurve: number[] = [];
    const trades: { entryIdx: number; exitIdx: number; side: "long" | "short"; pnl: number }[] = [];
    const initialCapital = request.initialCapital ?? 10_000;
    const feesBps = request.feesBps ?? 0;
    const slippageBps = request.slippageBps ?? 0;
    let equity = initialCapital;
    let position: { side: "long" | "short"; entry: number; size: number } | null = null;
    const tpPct = request.spec.risk.takeProfit ?? 0;
    const slPct = request.spec.risk.stopLoss ?? 0;

    bars.forEach((bar, idx) => {
      // simplistic rule eval: all entry rules must pass; exits close position
      const entryOk = evaluateRules(request.spec.rules.entries, features, idx);
      const exitOk = evaluateRules(request.spec.rules.exits, features, idx);
      const filterOk = request.spec.rules.filters
        ? evaluateRules(request.spec.rules.filters, features, idx)
        : true;

      if (!position && entryOk && filterOk) {
        const size = calcPositionSize(request.spec.risk, equity, bar, features, idx);
        position = { side: "long", entry: bar.close, size };
      } else if (position && exitOk) {
        const { pnl, feeCost } = computeTradePnl(position, bar.close, feesBps, slippageBps);
        equity += pnl - feeCost;
        trades.push({ entryIdx: idx, exitIdx: idx, side: position.side, pnl });
        position = null;
      } else if (position) {
        // TP/SL checks
        const changePct =
          ((bar.close - position.entry) / position.entry) * (position.side === "long" ? 1 : -1);
        if (tpPct && changePct >= tpPct / 100) {
          const { pnl, feeCost } = computeTradePnl(position, bar.close, feesBps, slippageBps);
          equity += pnl - feeCost;
          trades.push({ entryIdx: idx, exitIdx: idx, side: position.side, pnl });
          position = null;
        } else if (slPct && changePct <= -slPct / 100) {
          const { pnl, feeCost } = computeTradePnl(position, bar.close, feesBps, slippageBps);
          equity += pnl - feeCost;
          trades.push({ entryIdx: idx, exitIdx: idx, side: position.side, pnl });
          position = null;
        }
      }
      const mtm = position
        ? equity +
          (bar.close - position.entry) * position.size * (position.side === "long" ? 1 : -1)
        : equity;
      equityCurve.push(mtm);
    });

    const pnl = equityCurve[equityCurve.length - 1] - initialCapital;
    const { equityRef, tradesRef } = await this.persistence.saveBacktest({
      equity: equityCurve.map((eq, i) => ({ ts: bars[i]?.ts, equity: eq })),
      trades,
    });
    return {
      metrics: {
        netPnl: pnl,
        winRate: trades.length ? trades.filter((t) => t.pnl > 0).length / trades.length : 0,
        maxDrawdown: computeMaxDrawdown(equityCurve),
        profitFactor: computeProfitFactor(trades),
        trades: trades.length,
      },
      equityCurveRef: equityRef,
      tradesRef: tradesRef,
      warnings: ["Rule-based backtester stub: evaluates rule blocks minimally"],
    } satisfies BacktestResult;
  }
}

function evaluateRules(
  rules: StrategySpec["rules"]["entries"],
  features: Record<string, FeatureFrame[]>,
  idx: number,
): boolean {
  if (!rules?.length) {
    return false;
  }
  return rules.every((rule) => {
    const series = features[rule.indicator] ?? [];
    const targetIdx = Math.max(0, idx - (rule.lookback ?? 0));
    const frame = series[targetIdx];
    if (!frame) {
      return false;
    }
    const lhs = frame.values[rule.operands[0]];
    const rhs =
      typeof rule.threshold === "number"
        ? rule.threshold
        : (frame.values[rule.operands[1]] ?? rule.range?.[0]);
    if (lhs === undefined) {
      return false;
    }
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
        if (!rule.range) {
          return false;
        }
        return lhs >= rule.range[0] && lhs <= rule.range[1];
      case "outsideRange":
        if (!rule.range) {
          return false;
        }
        return lhs < rule.range[0] || lhs > rule.range[1];
      case "crossesAbove":
      case "crossesBelow":
        // simple cross check using previous frame
        const prev = series[targetIdx - 1];
        if (!prev) {
          return false;
        }
        const lhsPrev = prev.values[rule.operands[0]];
        const rhsPrev =
          typeof rule.threshold === "number" ? rule.threshold : prev.values[rule.operands[1]];
        if (lhsPrev === undefined || rhsPrev === undefined) {
          return false;
        }
        return rule.comparator === "crossesAbove"
          ? lhsPrev <= rhsPrev && lhs > rhs
          : lhsPrev >= rhsPrev && lhs < rhs;
      default:
        return false;
    }
  });
}

function calcPositionSize(
  risk: StrategySpec["risk"],
  equity: number,
  bar: PriceBar,
  features: Record<string, FeatureFrame[]>,
  idx: number,
): number {
  switch (risk.positionSizing) {
    case "fixed-dollar":
      return risk.sizingValue / bar.close;
    case "percent-equity":
      return (equity * (risk.sizingValue / 100)) / bar.close;
    case "atr": {
      const atrSeries = features["atr"];
      const atrVal = atrSeries?.[idx]?.values["atr"];
      if (atrVal && atrVal > 0) {
        // size so that 1 ATR move risks sizingValue % of equity
        const riskPct = risk.sizingValue / 100;
        const dollarRisk = equity * riskPct;
        return dollarRisk / atrVal;
      }
      return (equity * 0.01) / bar.close;
    }
    default:
      return (equity * 0.01) / bar.close;
  }
}

function computeTradePnl(
  position: { side: "long" | "short"; entry: number; size: number },
  exitPrice: number,
  feesBps: number,
  slippageBps: number,
) {
  const pnl =
    position.side === "long"
      ? (exitPrice - position.entry) * position.size
      : (position.entry - exitPrice) * position.size;
  const notional = position.entry * position.size;
  const feeCost = notional * ((feesBps + slippageBps) / 10_000) * 2; // entry + exit
  return { pnl, feeCost };
}
