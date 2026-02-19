import crypto from "node:crypto";
import type { ExecuteOrderRequest } from "../../../strategy/spec.js";

const PAPER_BASE = "https://paper-api.alpaca.markets";
const LIVE_BASE = "https://api.alpaca.markets";

export async function placeAlpacaOrder(req: ExecuteOrderRequest) {
  const base = req.paper !== false ? PAPER_BASE : LIVE_BASE;
  const key = process.env.ALPACA_API_KEY_ID ?? process.env.ALPACA_KEY;
  const secret = process.env.ALPACA_API_SECRET_KEY ?? process.env.ALPACA_SECRET;
  if (!key || !secret) {
    return { orderId: "alpaca-missing-creds", status: "error", warnings: ["ALPACA_API_KEY_ID/SECRET missing"] };
  }
  const body = {
    symbol: req.symbol,
    qty: req.quantity,
    side: req.side,
    type: req.orderType === "market" ? "market" : req.orderType,
    time_in_force: req.timeInForce ?? "gtc",
    client_order_id: req.clientOrderId ?? `sa-${crypto.randomUUID()}`,
    ...(req.price ? { limit_price: req.price } : {}),
  };
  const res = await fetch(`${base}/v2/orders`, {
    method: "POST",
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    return { orderId: "alpaca-failed", status: "error", warnings: [`${res.status}: ${text.slice(0, 200)}`] };
  }
  const json = (await res.json()) as { id?: string; status?: string };
  return { orderId: json.id ?? body.client_order_id, status: json.status ?? "submitted" };
}

export async function fetchAlpacaAccount() {
  const key = process.env.ALPACA_API_KEY_ID ?? process.env.ALPACA_KEY;
  const secret = process.env.ALPACA_API_SECRET_KEY ?? process.env.ALPACA_SECRET;
  if (!key || !secret) {
    return { ok: false, error: "ALPACA_API_KEY_ID/SECRET missing" } as const;
  }
  const res = await fetch(`${PAPER_BASE}/v2/account`, {
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
    },
  });
  if (!res.ok) {
    return { ok: false, error: `${res.status}` } as const;
  }
  const account = await res.json();

  // Positions
  const posRes = await fetch(`${PAPER_BASE}/v2/positions`, {
    headers: {
      "APCA-API-KEY-ID": key,
      "APCA-API-SECRET-KEY": secret,
    },
  });
  const positions = posRes.ok ? await posRes.json() : [];

  return { ok: true, data: { account, positions } } as const;
}
