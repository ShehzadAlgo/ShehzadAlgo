import crypto from "node:crypto";
import { exportToInternalDsl, exportToPine } from "../strategy/exporter.js";
import { materializeTemplate, searchTemplates } from "../strategy/search.js";
import type { BacktestRequest, ExecuteOrderRequest, StrategySpec, Timeframe } from "../strategy/spec.js";
import { StreamingWatcher, type StreamSubscription } from "../infra/strategy/streaming.js";
import { AlertDispatcher, type AlertTarget } from "../infra/strategy/alerts.js";
import { globalAlertRules } from "../infra/strategy/alert-rules.js";
import { placeAlpacaOrder } from "../infra/strategy/brokers/alpaca.js";
import { placeMt5Order } from "../infra/strategy/brokers/mt5.js";
import { checkRisk, recordOpenOrder, recordFill, recordMarketPrice } from "../infra/strategy/risk.js";
import { fetchAlpacaAccount } from "../infra/strategy/brokers/alpaca.js";
import { fetchMt5Account } from "../infra/strategy/brokers/mt5.js";
import { fetchBinanceAccount } from "../infra/strategy/brokers/binance.js";
import { resolveVenueForSymbol } from "../infra/strategy/symbol-router.js";

const BINANCE_TESTNET = process.env.BINANCE_TESTNET_URL ?? "https://testnet.binance.vision";

export async function strategySearch(prompt: string, limit?: number) {
  return searchTemplates(prompt, limit);
}

export async function strategyExport(templateId: string, params: Record<string, number> = {}) {
  const template = searchTemplates(templateId, 1)[0]?.template;
  if (!template) {return { pine: null, internal: null, warnings: ["template not found"] };}
  const spec = materializeTemplate(template, params);
  return { pine: exportToPine(spec), internal: exportToInternalDsl(spec) };
}

export async function strategyBacktest(request: BacktestRequest) {
  const bars =
    request.bars ??
    (await fetchBinanceKlines(
      request.spec.instrument.symbol,
      request.spec.timeframe,
      request.start,
      request.end,
    ));
  if (!bars.length) {
    return {
      metrics: { netPnl: 0, winRate: 0, maxDrawdown: 0, profitFactor: 0, trades: 0 },
      equityCurveRef: "empty",
      tradesRef: "empty",
      warnings: ["no data"],
    };
  }
  const startPrice = bars[0].open;
  const endPrice = bars[bars.length - 1].close;
  const grossReturn = (endPrice - startPrice) / startPrice;
  const pnl = (request.initialCapital ?? 10_000) * grossReturn;
  const dd = computeMaxDrawdown(bars.map((b) => b.close));
  return {
    metrics: {
      netPnl: pnl,
      winRate: pnl > 0 ? 1 : 0,
      maxDrawdown: dd,
      profitFactor: pnl > 0 ? 1 + grossReturn : 0,
      trades: 1,
    },
    equityCurveRef: "buy-hold",
    tradesRef: "buy-hold",
    warnings: ["simple buy/hold backtest"],
  };
}

export async function strategyExecute(request: ExecuteOrderRequest) {
  const liveEnabled = process.env.SHEHZADALGO_LIVE_TRADING === "1";
  if (request.paper === false && (!liveEnabled || !request.livePermission)) {
    return { orderId: "blocked-live", status: "blocked", warnings: ["live trading disabled"] };
  }
  if (!request.riskChecked) {
    return { orderId: "blocked-risk", status: "blocked", warnings: ["riskChecked=false"] };
  }

  const estPrice = request.price ?? 0;
  const risk = checkRisk(request, estPrice || 1);
  if (!risk.ok) {
    return {
      orderId: "blocked-risk",
      status: "blocked",
      warnings: [risk.reason ?? "risk block"],
      riskLimits: true,
    };
  }

  switch (request.broker) {
    case "binance":
      recordOpenOrder(request);
      return postProcess(request, await placeBinancePaper(request));
    case "alpaca":
      recordOpenOrder(request);
      return postProcess(request, await placeAlpacaOrder(request));
    case "mt5":
      recordOpenOrder(request);
      return postProcess(request, await placeMt5Order(request));
    default:
      return { orderId: "unsupported-broker", status: "error", warnings: [`Broker ${request.broker} not supported`] };
  }
}

export async function strategyWatch(opts: {
  symbol: string;
  timeframes: Timeframe[];
  venue?: StreamSubscription["venue"];
  alertTargets: AlertTarget[];
}): Promise<void> {
  const venue = opts.venue ?? resolveVenueForSymbol(opts.symbol);
  const watcher = new StreamingWatcher();
  for (const tf of opts.timeframes) {
    watcher.subscribe({
      symbol: opts.symbol,
      timeframe: tf,
      venue,
      assetClass: "crypto",
    });
  }
  const alerts = new AlertDispatcher(opts.alertTargets);

  watcher.on("bar", async ({ sub, bar }) => {
    // keep PnL marks fresh for positions on this broker/symbol
    recordMarketPrice(sub.venue, "*", sub.symbol, bar.close);

    const spec: StrategySpec = {
      name: `${sub.symbol}-${sub.timeframe}`,
      instrument: { symbol: sub.symbol, venue: sub.venue, assetClass: "crypto" },
      timeframe: sub.timeframe,
      rules: { entries: [], exits: [] },
      risk: { positionSizing: "percent-equity", sizingValue: 1 },
    };
    const text = `Close ${bar.close.toFixed(4)} | High ${bar.high.toFixed(4)} | Low ${bar.low.toFixed(
      4,
    )}`;
    await alerts.send({
      title: `Bar closed ${spec.name}`,
      body: text,
    });
    await globalAlertRules.evaluate(bar, sub.symbol);
  });

  watcher.start();
  process.on("SIGINT", () => watcher.stop());
  process.on("SIGTERM", () => watcher.stop());
}

type Kline = [number, string, string, string, string, string];

export async function strategyAccountStatus(broker: ExecuteOrderRequest["broker"]) {
  switch (broker) {
    case "binance":
      return fetchBinanceAccount();
    case "alpaca":
      return fetchAlpacaAccount();
    case "mt5":
      return fetchMt5Account();
    default:
      return { ok: false, error: "unsupported broker" } as const;
  }
}

async function placeBinancePaper(request: ExecuteOrderRequest) {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || !apiSecret) {
    return { orderId: "missing-creds", status: "error", warnings: ["BINANCE_API_KEY/SECRET missing"] };
  }
  const endpoint = "/api/v3/order";
  const params = new URLSearchParams();
  params.set("symbol", request.symbol.toUpperCase());
  params.set("side", request.side.toUpperCase());
  params.set("type", request.orderType.toUpperCase());
  params.set("quantity", request.quantity.toString());
  if (request.price) {params.set("price", request.price.toString());}
  if (request.timeInForce) {params.set("timeInForce", request.timeInForce.toUpperCase());}
  params.set("newClientOrderId", request.clientOrderId ?? `paper-${Date.now()}`);
  params.set("recvWindow", "5000");
  params.set("timestamp", Date.now().toString());
  const signature = crypto.createHmac("sha256", apiSecret).update(params.toString()).digest("hex");
  params.set("signature", signature);
  const res = await fetch(`${BINANCE_TESTNET}${endpoint}`, {
    method: "POST",
    headers: {
      "X-MBX-APIKEY": apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    return { orderId: "paper-failed", status: "error", warnings: [`${res.status}: ${text.slice(0, 200)}`] };
  }
  const body = (await res.json()) as { clientOrderId?: string; status?: string };
  return { orderId: body.clientOrderId ?? `paper-${Date.now()}`, status: body.status ?? "paper" };
}

function postProcess(request: ExecuteOrderRequest, res: { orderId?: string; status?: string; warnings?: string[] }) {
  if (res.status && res.status !== "error" && res.status !== "blocked") {
    const fillPrice = request.price ?? 0;
    recordFill(request, fillPrice);
  }
  return res;
}

async function fetchBinanceKlines(symbol: string, interval: string, start: string, end: string) {
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.searchParams.set("symbol", symbol.toUpperCase());
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", "1000");
  url.searchParams.set("startTime", String(new Date(start).getTime()));
  url.searchParams.set("endTime", String(new Date(end).getTime()));
  const res = await fetch(url);
  if (!res.ok) {return [];}
  const data = (await res.json()) as Kline[];
  return data.map((k) => ({
    openTime: k[0],
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

function computeMaxDrawdown(series: number[]): number {
  let peak = series[0] ?? 0;
  let maxDd = 0;
  for (const v of series) {
    if (v > peak) {peak = v;}
    const dd = peak ? (peak - v) / peak : 0;
    if (dd > maxDd) {maxDd = dd;}
  }
  return maxDd;
}
