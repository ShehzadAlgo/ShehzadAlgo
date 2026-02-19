import type { ExecuteOrderRequest } from "../../../strategy/spec.js";

const DEFAULT_BRIDGE = process.env.MT5_BRIDGE_URL;

export async function placeMt5Order(req: ExecuteOrderRequest) {
  if (!DEFAULT_BRIDGE) {
    return { orderId: "mt5-missing-bridge", status: "error", warnings: ["MT5_BRIDGE_URL missing"] };
  }
  const url = new URL("/orders", DEFAULT_BRIDGE);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symbol: req.symbol,
      volume: req.quantity,
      side: req.side,
      type: req.orderType,
      price: req.price,
      timeInForce: req.timeInForce,
      clientOrderId: req.clientOrderId,
      paper: req.paper !== false,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return { orderId: "mt5-failed", status: "error", warnings: [`${res.status}: ${txt.slice(0, 200)}`] };
  }
  const json = (await res.json()) as { orderId?: string; status?: string };
  return { orderId: json.orderId ?? req.clientOrderId ?? "mt5-order", status: json.status ?? "submitted" };
}

export async function fetchMt5Account() {
  if (!DEFAULT_BRIDGE) {
    return { ok: false, error: "MT5_BRIDGE_URL missing" } as const;
  }
  try {
    const url = new URL("/account", DEFAULT_BRIDGE);
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, error: `${res.status}` } as const;
    }
    const account = await res.json();
    const posRes = await fetch(new URL("/positions", DEFAULT_BRIDGE));
    const positions = posRes.ok ? await posRes.json() : [];
    return { ok: true, data: { account, positions } } as const;
  } catch (err) {
    return { ok: false, error: String(err) } as const;
  }
}
