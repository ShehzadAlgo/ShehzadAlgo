import { strategyAccountStatus } from "../../commands/strategy.js";
import { getPositionSnapshot } from "../../infra/strategy/risk.js";

export async function positionsController() {
  const brokers: Array<"binance" | "alpaca" | "mt5"> = ["binance", "alpaca", "mt5"];
  const accounts = [];
  for (const broker of brokers) {
    const status = await strategyAccountStatus(broker);
    accounts.push({ broker, status });
  }
  const positions = getPositionSnapshot();
  return { accounts, positions };
}
