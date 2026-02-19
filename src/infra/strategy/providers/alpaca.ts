import type { PriceBar, Timeframe } from "../../../strategy/spec.js";

const ALPACA_BASE = "https://data.alpaca.markets/v2";

const TF_MAP: Record<Timeframe, string> = {
  "1m": "1Min",
  "3m": "3Min",
  "5m": "5Min",
  "15m": "15Min",
  "30m": "30Min",
  "1h": "1Hour",
  "2h": "2Hour",
  "4h": "4Hour",
  "6h": "6Hour",
  "12h": "12Hour",
  "1d": "1Day",
};

export async function fetchAlpacaLatestBar(
  symbol: string,
  timeframe: Timeframe,
): Promise<PriceBar | null> {
  const tf = TF_MAP[timeframe];
  if (!tf) {return null;}
  const key = process.env.ALPACA_API_KEY_ID ?? process.env.ALPACA_KEY ?? "";
  const secret = process.env.ALPACA_API_SECRET_KEY ?? process.env.ALPACA_SECRET ?? "";
  if (!key || !secret) {
    return null;
  }
  const url = new URL(`${ALPACA_BASE}/stocks/${symbol}/bars`);
  url.searchParams.set("timeframe", tf);
  url.searchParams.set("limit", "1");
  try {
    const res = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
      },
    });
    if (!res.ok) {
      return null;
    }
    const data = (await res.json()) as { bars?: Array<{ t: string; o: number; h: number; l: number; c: number; v: number }> };
    const bar = data.bars?.[0];
    if (!bar) {return null;}
    return {
      ts: new Date(bar.t).toISOString(),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
      timeframe,
    };
  } catch {
    return null;
  }
}
