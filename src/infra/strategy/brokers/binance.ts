import crypto from "node:crypto";

const BASE = process.env.BINANCE_TESTNET_URL ?? "https://testnet.binance.vision";

function creds() {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("BINANCE_API_KEY/SECRET missing");
  }
  return { apiKey, apiSecret };
}

export async function fetchBinanceAccount() {
  try {
    const { apiKey, apiSecret } = creds();
    const params = new URLSearchParams();
    params.set("timestamp", Date.now().toString());
    const signature = crypto.createHmac("sha256", apiSecret).update(params.toString()).digest("hex");
    params.set("signature", signature);
    const res = await fetch(`${BASE}/api/v3/account?${params.toString()}`, {
      headers: { "X-MBX-APIKEY": apiKey },
    });
    if (!res.ok) {
      return { ok: false, error: `${res.status}` } as const;
    }
    const account = await res.json();

    // Open orders as lightweight positions proxy
    const ordersRes = await fetch(`${BASE}/api/v3/openOrders?${params.toString()}`, {
      headers: { "X-MBX-APIKEY": apiKey },
    });
    const orders = ordersRes.ok ? await ordersRes.json() : [];

    return { ok: true, data: { account, orders } } as const;
  } catch (err) {
    return { ok: false, error: String(err) } as const;
  }
}
