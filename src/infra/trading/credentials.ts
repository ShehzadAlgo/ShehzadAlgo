import fs from "node:fs/promises";
import { chmod, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import os from "node:os";

export type TradingAccount = {
  name: string;
  broker: "binance" | "mt5" | string;
  mode: "paper" | "live";
  apiKey?: string;
  apiSecret?: string;
  host?: string;
  username?: string;
  password?: string;
};

const baseDir = join(os.homedir(), ".shehzadalgo", "credentials");
const filePath = join(baseDir, "trading.json");

async function ensureDir() {
  await mkdir(baseDir, { recursive: true });
  await chmod(baseDir, 0o700).catch(() => {});
}

export async function loadTradingAccounts(): Promise<TradingAccount[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {return parsed as TradingAccount[];}
    return [];
  } catch {
    return [];
  }
}

export async function saveTradingAccounts(accounts: TradingAccount[]) {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(accounts, null, 2), { mode: 0o600 });
  await chmod(filePath, 0o600).catch(() => {});
}

export async function upsertTradingAccount(account: TradingAccount) {
  const existing = await loadTradingAccounts();
  const next = existing.filter((a) => a.name !== account.name);
  next.push(account);
  await saveTradingAccounts(next);
}

export async function removeTradingAccount(name: string) {
  const existing = await loadTradingAccounts();
  const next = existing.filter((a) => a.name !== name);
  await saveTradingAccounts(next);
}

export async function updateTradingAccountMode(name: string, mode: TradingAccount["mode"]) {
  const existing = await loadTradingAccounts();
  const next = existing.map((a) => (a.name === name ? { ...a, mode } : a));
  await saveTradingAccounts(next);
}

export function tradingCredentialsPath() {
  return filePath;
}
