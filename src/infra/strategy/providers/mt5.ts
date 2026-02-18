import type { PriceBar, Timeframe } from "../../../strategy/spec.js";

/**
 * Placeholder MT5 bridge fetcher.
 * Expected: a local/remote bridge exposing HTTP/WebSocket bars.
 * Wire your bridge URL via MT5_BRIDGE_URL; returns null if unavailable.
 */
export async function fetchMt5LatestBar(
  symbol: string,
  timeframe: Timeframe,
): Promise<PriceBar | null> {
  const base = process.env.MT5_BRIDGE_URL;
  if (!base) {return null;}
  try {
    const url = new URL("/bars/latest", base);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("timeframe", timeframe);
    const res = await fetch(url);
    if (!res.ok) {return null;}
    const data = (await res.json()) as {
      ts: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    };
    if (!data?.ts) {return null;}
    return { ...data, timeframe };
  } catch {
    return null;
  }
}
