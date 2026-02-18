// Core strategy types (minimal stub for downstream integration).

export type AssetClass = "fx" | "metal" | "crypto" | "equity" | "futures" | "cfd";

export interface InstrumentRef {
  symbol: string;
  venue: string;
  assetClass: AssetClass;
  currency?: string;
}

export type Timeframe =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "6h"
  | "12h"
  | "1d";

export interface RuleCondition {
  indicator: string;
  operands: string[];
  comparator:
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "crossesAbove"
    | "crossesBelow"
    | "equals"
    | "insideRange"
    | "outsideRange";
  threshold?: number;
  /** Optional numeric range [min, max] for inside/outside range comparators. */
  range?: [number, number];
  lookback?: number;
}

export interface RiskSettings {
  positionSizing: "fixed-dollar" | "percent-equity" | "atr";
  sizingValue: number;
  maxLeverage?: number;
  takeProfit?: number;
  stopLoss?: number;
  maxDailyLoss?: number;
}

export interface SessionSettings {
  timezone: string;
  tradingHours?: string[];
  blackoutWindows?: string[];
}

export interface StrategyRuleBlock {
  entries: RuleCondition[];
  exits: RuleCondition[];
  filters?: RuleCondition[];
}

export interface StrategySpec {
  id?: string;
  name: string;
  description?: string;
  instrument: InstrumentRef;
  timeframe: Timeframe;
  rules: StrategyRuleBlock;
  risk: RiskSettings;
  session?: SessionSettings;
  featuresUsed?: string[];
  versionHash?: string;
}

export interface BacktestRequest {
  spec: StrategySpec;
  dataVersion?: string;
  start: string;
  end: string;
  bars?: PriceBar[];
  feesBps?: number;
  slippageBps?: number;
  initialCapital?: number;
  outOfSampleSplit?: number;
  minTrades?: number;
}

export interface BacktestMetrics {
  netPnl: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
  trades: number;
}

export interface BacktestResult {
  metrics: BacktestMetrics;
  equityCurveRef: string;
  tradesRef: string;
  warnings?: string[];
  cacheKey?: string;
}

export type Broker = "mt5" | "binance" | "alpaca" | "oanda" | "ib";

// Basic OHLCV bar; normalized downstream for venue/symbol context.
export interface PriceBar {
  ts: string; // ISO timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timeframe?: Timeframe;
}

export interface LiveSignal {
  specId: string;
  dataVersion: string;
  signal: "entry" | "exit";
  side: "long" | "short";
  price: number;
  size: number;
  timestamp: string;
  healthFlags?: string[];
}

export interface ExecuteOrderRequest {
  broker: Broker;
  accountRef: string;
  orderType: "market" | "limit" | "stop" | "stopLimit";
  side: "buy" | "sell";
  symbol: string;
  quantity: number;
  price?: number;
  timeInForce?: "gtc" | "fok" | "ioc";
  clientOrderId?: string;
  paper?: boolean;
  riskChecked: boolean;
  livePermission?: boolean;
}

export interface ValidationResult {
  ok: boolean;
  errors?: string[];
}

export function validateStrategySpec(spec: StrategySpec): ValidationResult {
  const errors: string[] = [];
  if (!spec.name?.trim()) {errors.push("name is required");}
  if (!spec.instrument?.symbol) {errors.push("instrument.symbol is required");}
  if (!spec.timeframe) {errors.push("timeframe is required");}
  if (!spec.rules?.entries?.length) {errors.push("at least one entry rule is required");}
  if (!spec.risk) {errors.push("risk settings are required");}
  return { ok: errors.length === 0, errors: errors.length ? errors : undefined };
}
