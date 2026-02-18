import {
  addTradingAccount,
  deleteTradingAccount,
  listTradingAccounts,
  updateTradingAccountModeStorage,
} from "../../commands/trading-accounts.js";
import type { TradingAccount } from "../../infra/trading/credentials.js";
import { maskAccount, validateAccount, type TradingAccountInput } from "./validation.js";

export async function listAccountsController() {
  const accounts = await listTradingAccounts();
  return accounts.map(maskAccount);
}

export async function addAccountController(input: TradingAccountInput) {
  const validation = validateAccount(input);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors ?? [] } as const;
  }
  const account: TradingAccount = {
    name: input.name.trim(),
    broker: input.broker,
    mode: input.mode ?? "paper",
    apiKey: input.apiKey,
    apiSecret: input.apiSecret,
    host: input.host,
    username: input.username,
    password: input.password,
  };
  await addTradingAccount(account);
  return { ok: true } as const;
}

export async function deleteAccountController(name: string) {
  if (!name?.trim()) {return { ok: false, errors: ["name is required"] } as const;}
  await deleteTradingAccount(name.trim());
  return { ok: true } as const;
}

export async function setAccountModeController(name: string, mode: "paper" | "live") {
  if (!name?.trim()) {return { ok: false, errors: ["name is required"] } as const;}
  if (!["paper", "live"].includes(mode)) {
    return { ok: false, errors: ["mode must be paper or live"] } as const;
  }
  await updateTradingAccountModeStorage(name.trim(), mode);
  return { ok: true } as const;
}
