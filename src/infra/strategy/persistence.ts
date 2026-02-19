import type { BacktestResult } from "../../strategy/spec.js";

// Simple in-memory persistence; replace with database or object store in production.
export interface Persistence {
  saveBacktest(result: { equity: unknown; trades: unknown }): Promise<{ equityRef: string; tradesRef: string }>;
}

export class InMemoryPersistence implements Persistence {
  #equityCurves = new Map<string, unknown>();
  #trades = new Map<string, unknown>();

  async saveBacktest(result: { equity: unknown; trades: unknown }): Promise<{ equityRef: string; tradesRef: string }> {
    const equityRef = `equity:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    const tradesRef = `trades:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    this.#equityCurves.set(equityRef, result.equity);
    this.#trades.set(tradesRef, result.trades);
    return { equityRef, tradesRef };
  }

  loadBacktest(refs: { equityRef: string; tradesRef: string }): BacktestResult | null {
    const equity = this.#equityCurves.get(refs.equityRef);
    const trades = this.#trades.get(refs.tradesRef);
    if (!equity || !trades) {return null;}
    return { equityCurveRef: refs.equityRef, tradesRef: refs.tradesRef, metrics: { netPnl: 0, winRate: 0, maxDrawdown: 0, profitFactor: 0, trades: 0 } };
  }
}
