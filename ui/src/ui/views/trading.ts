import { html } from "lit";
import {
  tradingState,
  loadTradingAccounts,
  loadTradingSummary,
  addTradingAccount,
  deleteTradingAccount,
  setTradingAccountMode,
} from "../controllers/trading.ts";
import { t } from "../../i18n/index.ts";

export function renderTrading() {
  const state = tradingState;

  const addForm = html`
    <form class="card" @submit=${onSubmitAdd}>
      <div class="card__title">Trading Accounts</div>
      <div class="form-row">
        <label>Name</label>
        <input name="name" required placeholder="my-binance-testnet" />
      </div>
      <div class="form-row">
        <label>Broker</label>
        <select name="broker" required>
          <option value="binance">Binance (testnet)</option>
          <option value="mt5">MT5 (paper)</option>
        </select>
      </div>
      <div class="form-row">
        <label>API Key / MT5 User</label>
        <input name="apiKey" placeholder="API key or MT5 username" />
      </div>
      <div class="form-row">
        <label>API Secret / MT5 Password</label>
        <input name="apiSecret" placeholder="API secret or MT5 password" type="password" />
      </div>
      <div class="form-row">
        <label>MT5 Host (MT5 only)</label>
        <input name="host" placeholder="mt5.example.com:443" />
      </div>
      <div class="form-row checkbox">
        <label>
          <input name="live" type="checkbox" disabled />
          Live trading (disabled; paper default)
        </label>
      </div>
      <button class="btn" type="submit" ?disabled=${state.saving}>Add Account</button>
      ${state.error ? html`<div class="callout danger">${state.error}</div>` : null}
    </form>
  `;

  const list = html`
    <div class="card">
      <div class="card__title">Existing Accounts</div>
      ${state.loading
        ? html`<div class="muted">Loading...</div>`
        : state.accounts.length === 0
          ? html`<div class="muted">No accounts</div>`
          : html`<table class="table">
              <thead>
                <tr><th>Name</th><th>Broker</th><th>Mode</th><th>Status</th><th>Risk</th><th></th></tr>
              </thead>
              <tbody>
                ${state.accounts.map(
                  (a: any) => html`<tr>
                    <td>${a.name}</td>
                    <td>${a.broker}</td>
                    <td>
                      <span class=${a.mode === "live" ? "pill danger" : "pill"}>${a.mode}</span>
                    </td>
                    <td>${a.status ?? "--"}</td>
                    <td>
                      <span class="muted small">
                        Max Notional ${Number(import.meta.env.SHEHZADALGO_RISK_MAX_NOTIONAL ?? 1000)}/order<br />
                        Max Pos ${Number(import.meta.env.SHEHZADALGO_RISK_MAX_POSITION ?? 5)} · Orders ${Number(import.meta.env.SHEHZADALGO_RISK_MAX_ORDERS ?? 5)}<br />
                        DD ${Number(import.meta.env.SHEHZADALGO_RISK_MAX_DRAWDOWN ?? 10)}% · Cooldown ${(Number(import.meta.env.SHEHZADALGO_RISK_COOLDOWN_MS ?? 600000) / 60000).toFixed(0)}m
                      </span>
                    </td>
                    <td>
                      <button
                        class="btn btn-secondary"
                        @click=${() => onMode(a.name, "paper")}
                        ?disabled=${state.saving || a.mode === "paper"}
                      >
                        Paper
                      </button>
                      <button
                        class="btn btn-danger"
                        title="Requires live toggle + env gating"
                        @click=${() => onMode(a.name, "live")}
                        ?disabled=${state.saving || a.mode === "live"}
                      >
                        Enable Live
                      </button>
                      <button class="btn btn-danger" @click=${() => onDelete(a.name)} ?disabled=${state.saving}>Remove</button>
                    </td>
                  </tr>`,
                )}
              </tbody>
            </table>`}
    </div>
  `;

  return html`
    <div class="grid">
      ${addForm}
      ${list}
      ${renderSummary()}
    </div>
  `;
}

async function onSubmitAdd(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const fd = new FormData(form);
  const ok = await addTradingAccount({
    name: String(fd.get("name") ?? "").trim(),
    broker: String(fd.get("broker") ?? "binance"),
    apiKey: String(fd.get("apiKey") ?? "").trim(),
    apiSecret: String(fd.get("apiSecret") ?? "").trim(),
    host: String(fd.get("host") ?? "").trim() || undefined,
    username: String(fd.get("apiKey") ?? "").trim(),
    password: String(fd.get("apiSecret") ?? "").trim(),
    live: false,
  });
  if (ok) {form.reset();}
}

async function onDelete(name: string) {
  await deleteTradingAccount(name);
}

async function onMode(name: string, mode: "paper" | "live") {
  const ok = mode === "paper" || window.confirm("Enable live trading? Ensure env live gating is on.");
  if (!ok) {return;}
  await setTradingAccountMode(name, mode);
}

// eager load on view render
Promise.all([loadTradingAccounts(), loadTradingSummary()]).catch(() => {});

function renderSummary() {
  const accounts = (tradingState.summary.accounts as any[]) ?? [];
  const positions = (tradingState.summary.positions as any[]) ?? [];
  return html`
    <div class="card">
      <div class="card__title">Positions & Balances</div>
      ${accounts.length === 0 && positions.length === 0
        ? html`<div class="muted">No data</div>`
        : html`
            <div class="split">
              <div>
                <div class="card-sub">Accounts</div>
                ${accounts.map(
                  (a) => html`<div class="muted small">
                    ${a.broker}: ${a.status?.ok ? "ok" : a.status?.error ?? "unknown"}
                  </div>`,
                )}
              </div>
              <div>
                <div class="card-sub">Positions</div>
                ${positions.length === 0
                  ? html`<div class="muted small">No open positions</div>`
                  : html`<table class="table">
                      <thead>
                        <tr><th>Broker</th><th>Symbol</th><th>Size</th><th>Avg</th><th>Last</th><th>Unreal.</th><th>Real.</th></tr>
                      </thead>
                      <tbody>
                        ${positions.map(
                          (p) => html`<tr>
                            <td>${p.broker}</td>
                            <td>${p.symbol}</td>
                            <td>${p.size}</td>
                            <td>${Number(p.avg).toFixed(4)}</td>
                            <td>${p.last !== undefined ? Number(p.last).toFixed(4) : "--"}</td>
                            <td class=${Number(p.unrealized ?? 0) >= 0 ? "success" : "danger"}>
                              ${p.unrealized !== undefined ? Number(p.unrealized).toFixed(2) : "--"}
                            </td>
                            <td class=${Number(p.realized ?? 0) >= 0 ? "success" : "danger"}>
                              ${p.realized !== undefined ? Number(p.realized).toFixed(2) : "--"}
                            </td>
                          </tr>`,
                        )}
                      </tbody>
                    </table>`}
              </div>
            </div>
          `}
    </div>
  `;
}
