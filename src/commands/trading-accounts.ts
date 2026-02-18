import {
  loadTradingAccounts,
  removeTradingAccount,
  tradingCredentialsPath,
  upsertTradingAccount,
  updateTradingAccountMode,
} from "../infra/trading/credentials.js";
import type { TradingAccount } from "../infra/trading/credentials.js";

export async function listTradingAccounts() {
  return loadTradingAccounts();
}

export async function addTradingAccount(input: TradingAccount) {
  await upsertTradingAccount(input);
  return { saved: true, path: tradingCredentialsPath() };
}

export async function deleteTradingAccount(name: string) {
  await removeTradingAccount(name);
  return { deleted: true };
}

export async function updateTradingAccountModeStorage(name: string, mode: "paper" | "live") {
  await updateTradingAccountMode(name, mode);
  return { saved: true, path: tradingCredentialsPath() };
}
