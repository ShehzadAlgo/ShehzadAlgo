import type { TradingAccount } from "../../infra/trading/credentials.js";

const allowedBrokers = ["binance", "mt5"] as const;
const allowedModes = ["paper", "live"] as const;

export type TradingAccountInput = Omit<TradingAccount, "mode"> & {
  mode?: "paper" | "live";
};

export function validateAccount(input: TradingAccountInput): { ok: boolean; errors?: string[] } {
  const errors: string[] = [];
  if (!input.name?.trim()) {errors.push("name is required");}
  if (!input.broker || !allowedBrokers.includes(input.broker as any)) {
    errors.push("broker must be one of binance|mt5");
  }
  const mode = input.mode ?? "paper";
  if (!allowedModes.includes(mode as any)) {errors.push("mode must be paper or live");}
  if (input.broker === "binance") {
    if (!input.apiKey?.trim()) {errors.push("apiKey required for binance");}
    if (!input.apiSecret?.trim()) {errors.push("apiSecret required for binance");}
  }
  if (input.broker === "mt5") {
    if (!input.host?.trim()) {errors.push("host required for mt5");}
    if (!input.username?.trim()) {errors.push("username required for mt5");}
    if (!input.password?.trim()) {errors.push("password required for mt5");}
  }

  return { ok: errors.length === 0, errors: errors.length ? errors : undefined };
}

export function maskAccount(account: TradingAccount) {
  const mask = (v?: string) => (v ? `${v.slice(0, 2)}***` : undefined);
  return {
    ...account,
    apiKey: mask(account.apiKey),
    apiSecret: account.apiSecret ? "***" : undefined,
    password: account.password ? "***" : undefined,
  };
}
