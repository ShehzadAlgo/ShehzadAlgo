import type { BacktestRequest, BacktestResult, PriceBar } from "../../strategy/spec.js";

export interface Backtester {
  run(request: BacktestRequest): Promise<BacktestResult>;
}

export class SimpleBacktester implements Backtester {
  async run(request: BacktestRequest): Promise<BacktestResult> {
    const bars = request.bars ?? [];
    if (bars.length < 2) {
      return {
        metrics: zeroMetrics(),
        equityCurveRef: "backtest:none",
        tradesRef: "backtest:none",
        warnings: ["Insufficient bars provided to backtest"],
      };
    }

    const initialCapital = request.initialCapital ?? 10_000;
    const feesBps = request.feesBps ?? 0;
    const slippageBps = request.slippageBps ?? 0;

    const trades: { entry: PriceBar; exit: PriceBar; pnl: number }[] = [];
    const entry = bars[0];
    const exit = bars[bars.length - 1];
    const grossReturn = (exit.close - entry.close) / entry.close;
    const fee = (feesBps + slippageBps) / 10_000;
    const netReturn = grossReturn - fee;
    const pnl = initialCapital * netReturn;
    trades.push({ entry, exit, pnl });

    const equityCurve = bars.map((b, idx) => ({
      ts: b.ts,
      equity: initialCapital * (1 + ((b.close - entry.close) / entry.close - fee)),
    }));
    const maxDrawdown = computeMaxDrawdown(equityCurve.map((p) => p.equity));

    const metrics = {
      netPnl: pnl,
      winRate: pnl > 0 ? 1 : 0,
      maxDrawdown,
      profitFactor: pnl > 0 ? (pnl + initialCapital) / initialCapital : 0,
      trades: trades.length,
    };

    return {
      metrics,
      equityCurveRef: "backtest:equity:memory",
      tradesRef: "backtest:trades:memory",
      cacheKey: JSON.stringify({ spec: request.spec.name, start: request.start, end: request.end }),
      warnings: ["Simple backtester uses buy-hold over provided bars; plug real rule engine for prod"],
    };
  }
}

export function computeMaxDrawdown(series: number[]): number {
  let peak = series[0] ?? 0;
  let maxDd = 0;
  for (const v of series) {
    if (v > peak) {peak = v;}
    const dd = peak ? (peak - v) / peak : 0;
    if (dd > maxDd) {maxDd = dd;}
  }
  return maxDd;
}

export function computeProfitFactor(trades: { pnl: number }[]): number {
  if (!trades.length) {return 0;}
  const gains = trades.filter((t) => t.pnl > 0).reduce((a, b) => a + b.pnl, 0);
  const losses = trades.filter((t) => t.pnl < 0).reduce((a, b) => a + Math.abs(b.pnl), 0);
  if (losses === 0) {return gains > 0 ? Infinity : 0;}
  return gains / losses;
}

function zeroMetrics() {
  return { netPnl: 0, winRate: 0, maxDrawdown: 0, profitFactor: 0, trades: 0 };
}

export class NoopBacktester extends SimpleBacktester {}
