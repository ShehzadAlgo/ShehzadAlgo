// lightweight observable state; replace with your existing state helper if available
const reactive = <T extends object>(obj: T): T => obj;

export type TradingAccountUI = {
  name: string;
  broker: string;
  mode: "paper" | "live";
  apiKey?: string;
  status?: string;
};

export const tradingState = reactive({
  accounts: [] as TradingAccountUI[],
  summary: {
    accounts: [],
    positions: [] as Array<{
      broker: string;
      account: string;
      symbol: string;
      size: number;
      avg: number;
      last?: number;
      unrealized?: number;
      realized?: number;
    }>,
  },
  loading: false,
  error: null as string | null,
  saving: false,
});

function authHeaders() {
  const token = localStorage.getItem("authToken") ?? "";
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

export async function loadTradingAccounts() {
  tradingState.loading = true;
  tradingState.error = null;
  try {
    const res = await fetch("/api/trading/accounts", { headers: authHeaders() });
    if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
    const data = await res.json();
    if (!data.ok) {throw new Error(data.error ?? "failed to load accounts");}
    tradingState.accounts = data.accounts ?? [];
  } catch (err) {
    tradingState.error = (err as Error).message;
  } finally {
    tradingState.loading = false;
  }
}

export async function loadTradingSummary() {
  try {
    const res = await fetch("/api/trading/positions", { headers: authHeaders() });
    if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
    const data = await res.json();
    if (!data.ok) {throw new Error(data.error ?? "failed to load summary");}
    tradingState.summary = data.data ?? { accounts: [], positions: [] };
  } catch (err) {
    tradingState.error = (err as Error).message;
  }
}

export async function addTradingAccount(input: {
  name: string;
  broker: string;
  apiKey?: string;
  apiSecret?: string;
  host?: string;
  username?: string;
  password?: string;
  live?: boolean;
}) {
  tradingState.saving = true;
  tradingState.error = null;
  try {
    const body = {
      name: input.name,
      broker: input.broker,
      apiKey: input.apiKey,
      apiSecret: input.apiSecret,
      host: input.host,
      username: input.username,
      password: input.password,
      mode: input.live ? "live" : "paper",
    };
    const res = await fetch("/api/trading/accounts", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {throw new Error(data.error ?? data.errors?.join?.(", ") ?? `HTTP ${res.status}`);}
    await loadTradingAccounts();
    return true;
  } catch (err) {
    tradingState.error = (err as Error).message;
    return false;
  } finally {
    tradingState.saving = false;
  }
}

export async function deleteTradingAccount(name: string) {
  tradingState.saving = true;
  tradingState.error = null;
  try {
    const res = await fetch(`/api/trading/accounts/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {throw new Error(data.error ?? `HTTP ${res.status}`);}
    await loadTradingAccounts();
    return true;
  } catch (err) {
    tradingState.error = (err as Error).message;
    return false;
  } finally {
    tradingState.saving = false;
  }
}

export async function setTradingAccountMode(name: string, mode: "paper" | "live") {
  tradingState.saving = true;
  tradingState.error = null;
  try {
    const res = await fetch(`/api/trading/accounts/${encodeURIComponent(name)}/mode`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {throw new Error(data.error ?? `HTTP ${res.status}`);}
    await loadTradingAccounts();
    return true;
  } catch (err) {
    tradingState.error = (err as Error).message;
    return false;
  } finally {
    tradingState.saving = false;
  }
}
