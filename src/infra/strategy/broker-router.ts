import type { Broker } from "../../strategy/spec.js";
import { resolveVenueForSymbol } from "./symbol-router.js";

export function resolveBrokerForSymbol(symbol: string): Broker {
  const venue = resolveVenueForSymbol(symbol);
  switch (venue) {
    case "alpaca":
      return "alpaca";
    case "mt5":
      return "mt5";
    case "binance":
    default:
      return "binance";
  }
}
