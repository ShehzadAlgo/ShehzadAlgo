import type { ExecuteOrderRequest } from "../../strategy/spec.js";

type RiskConfig = {
  maxNotional: number;
  dailyLossCap: number;
  maxPositionSize: number;
  maxOpenOrders: number;
  maxDrawdownPct: number;
  cooldownMs: number;
};

const DEFAULT_RISK: RiskConfig = {
  maxNotional: Number(process.env.SHEHZADALGO_RISK_MAX_NOTIONAL ?? 1000),
  dailyLossCap: Number(process.env.SHEHZADALGO_RISK_DAILY_LOSS ?? 500),
  maxPositionSize: Number(process.env.SHEHZADALGO_RISK_MAX_POSITION ?? 5),
  maxOpenOrders: Number(process.env.SHEHZADALGO_RISK_MAX_ORDERS ?? 5),
  maxDrawdownPct: Number(process.env.SHEHZADALGO_RISK_MAX_DRAWDOWN ?? 10),
  cooldownMs: Number(process.env.SHEHZADALGO_RISK_COOLDOWN_MS ?? 10 * 60 * 1000),
};

const dailyLossBook = new Map<string, { date: string; loss: number }>();
const openOrdersBook = new Map<string, number>();
const positionSizeBook = new Map<string, number>(); // symbol-level size
const avgEntryBook = new Map<string, number>(); // symbol-level avg entry
const lastPriceBook = new Map<string, number>(); // symbol-level last mark
const realizedPnlBook = new Map<string, number>(); // symbol-level realized PnL
const lastLossTs = new Map<string, number>();
const peakEquity = new Map<string, number>();

export function checkRisk(
  request: ExecuteOrderRequest,
  estPrice: number,
  opts?: { currentEquity?: number },
): { ok: boolean; reason?: string } {
  const risk = DEFAULT_RISK;
  const notional = estPrice * request.quantity;
  if (notional > risk.maxNotional) {
    return { ok: false, reason: `Notional ${notional.toFixed(2)} exceeds max ${risk.maxNotional}` };
  }
  const key = `${request.broker}:${request.accountRef}`;
  const today = new Date().toISOString().slice(0, 10);
  const rec = dailyLossBook.get(key);
  if (!rec || rec.date !== today) {
    dailyLossBook.set(key, { date: today, loss: 0 });
  }
  const lossRec = dailyLossBook.get(key)!;
  if (lossRec.loss < -risk.dailyLossCap) {
    return { ok: false, reason: `Daily loss cap exceeded (${lossRec.loss.toFixed(2)} < -${risk.dailyLossCap})` };
  }

  // Position size per symbol (simple aggregate)
  const posKey = `${key}:${request.symbol}`;
  const posSize = (positionSizeBook.get(posKey) ?? 0) + request.quantity;
  if (posSize > risk.maxPositionSize) {
    return { ok: false, reason: `Position size ${posSize} > max ${risk.maxPositionSize}` };
  }

  // Open orders per account
  const open = openOrdersBook.get(key) ?? 0;
  if (open >= risk.maxOpenOrders) {
    return { ok: false, reason: `Max open orders reached (${open}/${risk.maxOpenOrders})` };
  }

  // Drawdown check
  const eqKey = `${key}:equity`;
  const currentEq = opts?.currentEquity;
  if (typeof currentEq === "number" && currentEq > 0) {
    const peak = Math.max(peakEquity.get(eqKey) ?? currentEq, currentEq);
    peakEquity.set(eqKey, peak);
    const dd = ((peak - currentEq) / peak) * 100;
    if (dd > risk.maxDrawdownPct) {
      return { ok: false, reason: `Drawdown ${dd.toFixed(2)}% exceeds max ${risk.maxDrawdownPct}%` };
    }
  }

  // Cooldown after loss
  const lastTs = lastLossTs.get(key);
  if (typeof lastTs === "number") {
    const since = Date.now() - lastTs;
    if (since < risk.cooldownMs) {
      return { ok: false, reason: `Cooldown active (${Math.ceil((risk.cooldownMs - since) / 1000)}s left)` };
    }
  }

  return { ok: true };
}

export function recordPnL(request: ExecuteOrderRequest, pnl: number) {
  const key = `${request.broker}:${request.accountRef}`;
  const today = new Date().toISOString().slice(0, 10);
  const rec = dailyLossBook.get(key);
  if (!rec || rec.date !== today) {
    dailyLossBook.set(key, { date: today, loss: pnl });
  } else {
    rec.loss += pnl;
    dailyLossBook.set(key, rec);
  }

  if (pnl < 0) {
    lastLossTs.set(key, Date.now());
  }
  const posKey = `${request.broker}:${request.accountRef}:${request.symbol}`;
  realizedPnlBook.set(posKey, (realizedPnlBook.get(posKey) ?? 0) + pnl);
}

export function recordOpenOrder(request: ExecuteOrderRequest) {
  const key = `${request.broker}:${request.accountRef}`;
  const current = openOrdersBook.get(key) ?? 0;
  openOrdersBook.set(key, current + 1);
}

export function clearOpenOrder(request: ExecuteOrderRequest) {
  const key = `${request.broker}:${request.accountRef}`;
  const current = openOrdersBook.get(key) ?? 0;
  openOrdersBook.set(key, Math.max(0, current - 1));
}

export function recordPositionSize(request: ExecuteOrderRequest) {
  const key = `${request.broker}:${request.accountRef}:${request.symbol}`;
  const current = positionSizeBook.get(key) ?? 0;
  positionSizeBook.set(key, current + request.quantity);
}

export function recordFill(request: ExecuteOrderRequest, fillPrice: number) {
  clearOpenOrder(request);
  const key = `${request.broker}:${request.accountRef}:${request.symbol}`;
  const current = positionSizeBook.get(key) ?? 0;
  const avg = avgEntryBook.get(key) ?? fillPrice;
  const isBuy = request.side === "buy";
  let newSize = current;
  let newAvg = avg;
  let realizedPnl = 0;

  if (isBuy) {
    // increasing position
    newSize = current + request.quantity;
    newAvg = newSize > 0 ? (avg * current + fillPrice * request.quantity) / newSize : fillPrice;
  } else {
    // closing position
    const closeQty = Math.min(current, request.quantity);
    realizedPnl = closeQty * (fillPrice - avg);
    newSize = Math.max(0, current - closeQty);
    newAvg = newSize > 0 ? avg : 0;
  }

  positionSizeBook.set(key, newSize);
  avgEntryBook.set(key, newAvg);
  if (realizedPnl !== 0) {
    recordPnL(request, realizedPnl);
  }
  lastPriceBook.set(key, fillPrice);
}

export function getPositionSize(broker: string, accountRef: string, symbol: string): number {
  return positionSizeBook.get(`${broker}:${accountRef}:${symbol}`) ?? 0;
}

export function getPositionSnapshot() {
  const entries: {
    broker: string;
    account: string;
    symbol: string;
    size: number;
    avg: number;
    last: number;
    unrealized: number;
    realized: number;
  }[] = [];
  for (const [key, size] of positionSizeBook.entries()) {
    const [broker, account, symbol] = key.split(":");
    const avg = avgEntryBook.get(key) ?? 0;
    if (size > 0) {
      const last = lastPriceBook.get(key) ?? avg;
      const unrealized = (last - avg) * size;
      const realized = realizedPnlBook.get(key) ?? 0;
      entries.push({ broker, account, symbol, size, avg, last, unrealized, realized });
    }
  }
  return entries;
}

export function recordMarketPrice(broker: string, accountRef: string, symbol: string, price: number) {
  if (accountRef === "*") {
    // Fan out to every open position for this broker/symbol so unrealized PnL stays fresh.
    for (const key of positionSizeBook.keys()) {
      const [b, acct, sym] = key.split(":");
      if (b === broker && sym === symbol) {
        lastPriceBook.set(`${b}:${acct}:${sym}`, price);
      }
    }
    return;
  }

  const key = `${broker}:${accountRef}:${symbol}`;
  lastPriceBook.set(key, price);
}
