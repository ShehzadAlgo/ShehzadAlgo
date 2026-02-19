import type { AssetClass, StrategySpec } from "./spec.js";

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  assetClasses: AssetClass[];
  baseSpec: Omit<StrategySpec, "rules" | "risk"> & {
    rules: StrategySpec["rules"];
    risk: StrategySpec["risk"];
  };
  tags?: string[];
}

export const templates: StrategyTemplate[] = [
  {
    id: "trend-hma",
    name: "HMA Trend",
    description: "Hull MA crossover with higher TF bias",
    assetClasses: ["crypto", "fx", "equity"],
    tags: ["trend", "crossover"],
    baseSpec: {
      name: "HMA Trend",
      description: "Hull moving average crossover",
      instrument: { symbol: "BTCUSDT", venue: "binance", assetClass: "crypto", currency: "USDT" },
      timeframe: "15m",
      rules: {
        entries: [
          { indicator: "hma_fast", operands: ["hma_fast", "hma_slow"], comparator: "crossesAbove" },
        ],
        exits: [
          { indicator: "hma_fast", operands: ["hma_fast", "hma_slow"], comparator: "crossesBelow" },
        ],
      },
      risk: {
        positionSizing: "percent-equity",
        sizingValue: 1,
        takeProfit: 2,
        stopLoss: 1,
      },
    },
  },
  {
    id: "vp-imbalance",
    name: "VP Imbalance",
    description: "Anchored volume profile POC shift with imbalance filter",
    assetClasses: ["crypto", "fx"],
    tags: ["volume", "breakout"],
    baseSpec: {
      name: "VP Imbalance",
      description: "Volume profile with bid/ask imbalance",
      instrument: { symbol: "ETHUSDT", venue: "binance", assetClass: "crypto", currency: "USDT" },
      timeframe: "15m",
      rules: {
        entries: [{ indicator: "poc-shift", operands: ["poc", "poc_prev"], comparator: "gt" }],
        exits: [{ indicator: "poc-shift", operands: ["poc", "poc_prev"], comparator: "lt" }],
        filters: [
          { indicator: "imbalance", operands: ["imbalance"], comparator: "gt", threshold: 5 },
        ],
      },
      risk: {
        positionSizing: "percent-equity",
        sizingValue: 1,
        takeProfit: 2,
        stopLoss: 1,
      },
    },
  },
  {
    id: "structure-reversal",
    name: "Structure Reversal",
    description: "HH/HL to LH/LL shift with BOS",
    assetClasses: ["crypto", "fx"],
    tags: ["structure", "reversal"],
    baseSpec: {
      name: "Structure Reversal",
      description: "Market structure break + reversal",
      instrument: { symbol: "BTCUSDT", venue: "binance", assetClass: "crypto", currency: "USDT" },
      timeframe: "5m",
      rules: {
        entries: [
          { indicator: "bos", operands: ["swing"], comparator: "crossesBelow", lookback: 1 },
        ],
        exits: [{ indicator: "bos", operands: ["swing"], comparator: "crossesAbove", lookback: 1 }],
      },
      risk: {
        positionSizing: "percent-equity",
        sizingValue: 0.5,
        takeProfit: 1.5,
        stopLoss: 0.75,
      },
    },
  },
];

export function getTemplateById(id: string): StrategyTemplate | undefined {
  return templates.find((t) => t.id === id);
}
