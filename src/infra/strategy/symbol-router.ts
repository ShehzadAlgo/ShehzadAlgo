import type { StreamVenue } from "./streaming.js";

// Simple heuristic routing; can be extended with explicit maps.
export function resolveVenueForSymbol(symbol: string): StreamVenue {
  const sym = symbol.toUpperCase();
  if (
    sym.includes("BTC") ||
    sym.includes("ETH") ||
    sym.endsWith("USDT") ||
    sym.endsWith("BUSD") ||
    sym === "XAUUSDT"
  ) {
    return "binance";
  }
  if (/^[A-Z]{3,5}USD$/.test(sym) && sym.length === 6) {
    return "mt5"; // forex majors like EURUSD, GBPUSD
  }
  if (/^[A-Z]{1,5}$/.test(sym)) {
    return "alpaca"; // equities ticker
  }
  return "binance";
}
