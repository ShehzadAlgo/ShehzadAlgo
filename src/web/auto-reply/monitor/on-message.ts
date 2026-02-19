import type { getReplyFromConfig } from "../../../auto-reply/reply.js";
import type { MsgContext } from "../../../auto-reply/templating.js";
import { loadConfig } from "../../../config/config.js";
import { logVerbose } from "../../../globals.js";
import { resolveAgentRoute } from "../../../routing/resolve-route.js";
import { buildGroupHistoryKey } from "../../../routing/session-key.js";
import { normalizeE164 } from "../../../utils.js";
import {
  strategyBacktest,
  strategyExecute,
  strategySearch,
  strategyWatch,
  strategyAccountStatus,
} from "../../../commands/strategy.js";
import type { BacktestRequest, ExecuteOrderRequest } from "../../../strategy/spec.js";
import { globalAlertRules, type Comparator } from "../../../infra/strategy/alert-rules.js";
import { resolveVenueForSymbol } from "../../../infra/strategy/symbol-router.js";
import type { MentionConfig } from "../mentions.js";
import type { WebInboundMsg } from "../types.js";
import { maybeBroadcastMessage } from "./broadcast.js";
import type { EchoTracker } from "./echo.js";
import type { GroupHistoryEntry } from "./group-gating.js";
import { applyGroupGating } from "./group-gating.js";
import { updateLastRouteInBackground } from "./last-route.js";
import { resolvePeerId } from "./peer.js";
import { processMessage } from "./process-message.js";

export function createWebOnMessageHandler(params: {
  cfg: ReturnType<typeof loadConfig>;
  verbose: boolean;
  connectionId: string;
  maxMediaBytes: number;
  groupHistoryLimit: number;
  groupHistories: Map<string, GroupHistoryEntry[]>;
  groupMemberNames: Map<string, Map<string, string>>;
  echoTracker: EchoTracker;
  backgroundTasks: Set<Promise<unknown>>;
  replyResolver: typeof getReplyFromConfig;
  replyLogger: ReturnType<(typeof import("../../../logging.js"))["getChildLogger"]>;
  baseMentionConfig: MentionConfig;
  account: { authDir?: string; accountId?: string };
}) {
  const rateMap = new Map<string, number>();
  const activeWatches = new Map<string, boolean>();

  const parseCasualIntent = (text: string) => {
    const lower = text.toLowerCase();
    if (/\bmarket update\b/.test(lower)) {return { kind: "market-update" as const };}
    const priceMatch = lower.match(/\b(btc|bitcoin|eth|ethusd|ethusdt|xau|gold|xauusd|xagusd|eurusd)\b/);
    if (priceMatch) {return { kind: "price", symbol: priceMatch[1] } as const;}
    if (lower.includes("signal") || lower.includes("alert")) {
      const sym = priceMatch?.[1] ?? "btc";
      return { kind: "watch", symbol: sym };
    }
    if (lower.includes("24/7") || lower.includes("always on") || lower.includes("hamesha")) {
      return { kind: "watch", symbol: priceMatch?.[1] ?? "btc" };
    }
    if (lower.includes("cross")) {
      const sym = priceMatch?.[1] ?? "eurusd";
      return { kind: "watch", symbol: sym };
    }
    if (/\b(balance|positions?|account)\b/.test(lower)) {
      return { kind: "account" as const };
    }
    const threshold = lower.match(/([a-z]{2,10}[/]?[a-z]{0,5})\\s*(>=|<=|>|<|==|=)\\s*([\\d.]+)/i);
    if (threshold) {
      return {
        kind: "threshold",
        symbol: threshold[1],
        comparator: threshold[2] as Comparator,
        value: Number(threshold[3]),
      };
    }
    return null;
  };

  const fetchBinancePrice = async (symbol: string): Promise<string | null> => {
    try {
      const clean = symbol.toUpperCase().replace(/[^A-Z]/g, "");
      const pair = clean.endsWith("USDT") ? clean : `${clean}USDT`;
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
      if (!res.ok) {return null;}
      const data = (await res.json()) as { price: string };
      return `${pair}: ${Number(data.price).toFixed(4)}`;
    } catch {
      return null;
    }
  };

  const formatAccountSummary = (broker: string, data: any): string => {
    switch (broker) {
      case "binance":
        return [
          "Binance (testnet)",
          formatBalances(data.account?.balances),
          formatOrders(data.orders),
        ]
          .filter(Boolean)
          .join("\n");
      case "alpaca":
        return [
          `Alpaca: equity ${data.account?.equity ?? "?"}, cash ${data.account?.cash ?? "?"}, buying_power ${data.account?.buying_power ?? "?"}`,
          formatPositions(data.positions),
        ]
          .filter(Boolean)
          .join("\n");
      case "mt5":
        return [
          `MT5: balance ${data.account?.balance ?? "?"}, equity ${data.account?.equity ?? "?"}, margin_free ${data.account?.margin_free ?? "?"}`,
          formatPositions(data.positions),
        ]
          .filter(Boolean)
          .join("\n");
      default:
        return "Account info unavailable.";
    }
  };

  const formatBalances = (balances?: any[]): string | null => {
    if (!Array.isArray(balances)) {return null;}
    const nonZero = balances.filter((b) => Number(b.free) > 0 || Number(b.locked) > 0).slice(0, 5);
    if (nonZero.length === 0) {return "Balances: 0";}
    return (
      "Balances:\n" +
      nonZero.map((b) => `${b.asset}: free ${b.free ?? 0} / locked ${b.locked ?? 0}`).join("\n")
    );
  };

  const formatOrders = (orders?: any[]): string | null => {
    if (!Array.isArray(orders) || orders.length === 0) {return null;}
    const top = orders.slice(0, 5);
    return "Open orders:\n" + top.map((o) => `${o.symbol} ${o.side} ${o.origQty}@${o.price ?? "mkt"}`).join("\n");
  };

  const formatPositions = (positions?: any[]): string | null => {
    if (!Array.isArray(positions) || positions.length === 0) {return null;}
    const top = positions.slice(0, 5);
    return (
      "Positions:\n" +
      top
        .map((p) => {
          const size = p.size ?? p.qty ?? p.volume ?? "?";
          const avg = p.avg ?? p.avg_entry_price ?? p.price ?? "?";
          const last = p.last ?? p.mark_price ?? p.lastPrice;
          const unreal = p.unrealized ?? p.unrealizedPnl;
          const realized = p.realized ?? p.realizedPnl;
          const unrealStr = unreal === undefined ? "" : ` | UPNL ${Number(unreal).toFixed(2)}`;
          const realStr = realized === undefined ? "" : ` | RPNL ${Number(realized).toFixed(2)}`;
          const lastStr = last === undefined ? "" : ` | last ${Number(last).toFixed(4)}`;
          return `${p.symbol ?? p.instrument}: qty ${size} avg ${avg}${lastStr}${unrealStr}${realStr}`;
        })
        .join("\n")
    );
  };

  const maybeHandleCasual = async (
    msg: WebInboundMsg,
    route: ReturnType<typeof resolveAgentRoute>,
    groupHistoryKey: string,
  ): Promise<boolean> => {
    if (!msg.body || msg.chatType === "group") {return false;}

    const intent = parseCasualIntent(msg.body);
    if (!intent) {return false;}

    if (intent.kind === "market-update" || intent.kind === "price") {
      const symbol = (intent as any).symbol ?? "btc";
      const price = await fetchBinancePrice(symbol);
      const body = price
        ? `Latest ${price}`
        : `Data for ${symbol.toUpperCase()} not available yet (fx/equities coming soon).`;
      await processForRoute(
        { ...msg, body, bodyText: body } as WebInboundMsg,
        route,
        groupHistoryKey,
        { suppressGroupHistoryClear: true },
      );
      return true;
    }

    if (intent.kind === "account") {
      const broker = "binance";
      const status = await strategyAccountStatus(broker);
      const body =
        (status as any).ok && (status as any).data
          ? formatAccountSummary(broker, (status as any).data)
          : `Account info unavailable (${(status as any).error ?? "missing creds"})`;
      await processForRoute(
        { ...msg, body, bodyText: body } as WebInboundMsg,
        route,
        groupHistoryKey,
        { suppressGroupHistoryClear: true },
      );
      return true;
    }

    if (intent.kind === "watch") {
      const symbol = ((intent as any).symbol ?? "btc").toUpperCase();
      const venue = resolveVenueForSymbol(symbol);
      const key = `${msg.from}:${symbol}`;
      if (activeWatches.has(key)) {
        const body = `Already watching ${symbol} (paper alerts).`;
        await processForRoute(
          { ...msg, body, bodyText: body } as WebInboundMsg,
          route,
          groupHistoryKey,
          { suppressGroupHistoryClear: true },
        );
        return true;
      }
      activeWatches.set(key, true);
      void strategyWatch({
        symbol:
          venue === "binance"
            ? symbol.endsWith("USDT") ? symbol : `${symbol}USDT`
            : symbol,
        timeframes: ["1m"],
        venue,
        alertTargets: [{ channel: "whatsapp" }],
      });
      const body = `Watch started for ${symbol} (1m, venue: ${venue}). Alerts will drop here on each bar close.`;
      await processForRoute(
        { ...msg, body, bodyText: body } as WebInboundMsg,
        route,
        groupHistoryKey,
        { suppressGroupHistoryClear: true },
      );
      return true;
    }

    if (intent.kind === "threshold") {
      const symbolRaw = (intent as any).symbol.replace("/", "").toUpperCase();
      const symbol =
        symbolRaw.length <= 5 && !symbolRaw.endsWith("USD") && !symbolRaw.endsWith("USDT")
          ? `${symbolRaw}USD`
          : symbolRaw;
      const ruleId = `${msg.from}:${symbol}:${Date.now()}`;
      globalAlertRules.register({
        id: ruleId,
        symbol,
        comparator: (intent as any).comparator,
        value: Number((intent as any).value),
        timeframe: "1m",
        alertTargets: [{ channel: "whatsapp" }],
      });
      const body = `Alert set: ${symbol} ${(intent as any).comparator} ${(intent as any).value} (1m, expires after first trigger).`;
      await processForRoute(
        { ...msg, body, bodyText: body } as WebInboundMsg,
        route,
        groupHistoryKey,
        { suppressGroupHistoryClear: true },
      );
      return true;
    }
    return false;
  };
  const processForRoute = async (
    msg: WebInboundMsg,
    route: ReturnType<typeof resolveAgentRoute>,
    groupHistoryKey: string,
    opts?: {
      groupHistory?: GroupHistoryEntry[];
      suppressGroupHistoryClear?: boolean;
    },
  ) =>
    processMessage({
      cfg: params.cfg,
      msg,
      route,
      groupHistoryKey,
      groupHistories: params.groupHistories,
      groupMemberNames: params.groupMemberNames,
      connectionId: params.connectionId,
      verbose: params.verbose,
      maxMediaBytes: params.maxMediaBytes,
      replyResolver: params.replyResolver,
      replyLogger: params.replyLogger,
      backgroundTasks: params.backgroundTasks,
      rememberSentText: params.echoTracker.rememberText,
      echoHas: params.echoTracker.has,
      echoForget: params.echoTracker.forget,
      buildCombinedEchoKey: params.echoTracker.buildCombinedKey,
      groupHistory: opts?.groupHistory,
      suppressGroupHistoryClear: opts?.suppressGroupHistoryClear,
    });

  const maybeHandleStrategy = async (
    msg: WebInboundMsg,
    route: ReturnType<typeof resolveAgentRoute>,
    groupHistoryKey: string,
  ): Promise<boolean> => {
    if (!msg.body) {return false;}
    if (msg.chatType === "group") {return false;} // block groups by default

    const allowlist = (params.cfg.channels?.whatsapp as any)?.strategyAllowlist ?? [];
    if (allowlist.length && !allowlist.includes(msg.senderE164 ?? msg.from)) {
      return false;
    }

    // simple rate limit: 1 request per 30s per sender
    const now = Date.now();
    if (!rateMap.has(msg.from)) {rateMap.set(msg.from, 0);}
    const last = rateMap.get(msg.from) ?? 0;
    if (now - last < 30_000) {return false;}
    rateMap.set(msg.from, now);

    const text = msg.body.toLowerCase();
    if (!(text.includes("strategy:") || text.includes("signal") || text.includes("backtest"))) {
      return false;
    }

    const symbolMatch = text.match(/([a-z]{3,5}usdt|xauusd|xagusd|[a-z]{3,5}usd)/i);
    const tfMatch = text.match(/\b(1m|3m|5m|15m|30m|1h|2h|4h|1d)\b/i);
    const symbol = (symbolMatch ? symbolMatch[1] : "BTCUSDT").toUpperCase();
    const timeframe = tfMatch ? tfMatch[1] : "15m";

    const requirePermission =
      (params.cfg.channels?.whatsapp as any)?.strategyRequirePermission ?? true;
    const hasConfirm =
      /confirm trade|trade ok|allow trade|execute yes|trade yes|run trade/.test(text);

    const search = await strategySearch(`${symbol} ${timeframe} trend`);
    const top = search[0]?.spec;
    if (!top) {return false;}

    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
    const backtestReq: BacktestRequest = {
      spec: {
        ...top,
        instrument: { symbol, venue: "binance", assetClass: "crypto", currency: "USDT" },
        timeframe: timeframe as any,
      },
      start: start.toISOString(),
      end: end.toISOString(),
      initialCapital: 10_000,
      feesBps: 7.5,
      slippageBps: 5,
      minTrades: 1,
    };
    const backtest = await strategyBacktest(backtestReq);

    const broker = resolveVenueForSymbol(symbol) === "alpaca" ? "alpaca" : resolveVenueForSymbol(symbol) === "mt5" ? "mt5" : "binance";

    const execReq: ExecuteOrderRequest = {
      broker,
      accountRef: "default",
      orderType: "market",
      side: "buy",
      symbol,
      quantity: 0.001,
      paper: true,
      riskChecked: true,
    };
    if (requirePermission && !hasConfirm) {
      const ask = `Paper ${broker} order ready. Reply 'confirm trade' to execute (still paper; live is gated).`;
      await processForRoute(
        { ...msg, body: ask, bodyText: ask } as WebInboundMsg,
        route,
        groupHistoryKey,
        { suppressGroupHistoryClear: true },
      );
      return true;
    }

    const exec = await strategyExecute(execReq);
    if ((exec as any).riskLimits) {
      const body = `Trade blocked by risk gate: ${(exec as any).warnings?.join?.(", ")}`;
      await processForRoute(
        { ...msg, body, bodyText: body } as WebInboundMsg,
        route,
        groupHistoryKey,
        { suppressGroupHistoryClear: true },
      );
      return true;
    }

    const reply = [
      `Strategy (paper) for ${symbol} @ ${timeframe}`,
      `Backtest: PnL ${backtest.metrics.netPnl?.toFixed?.(2) ?? 0}, WinRate ${(backtest.metrics.winRate * 100).toFixed(1)}%, DD ${(backtest.metrics.maxDrawdown * 100).toFixed(1)}%`,
      `PF: ${backtest.metrics.profitFactor?.toFixed?.(2) ?? 0}, Trades: ${backtest.metrics.trades ?? 0}`,
      `Paper order: ${exec.status ?? "ok"} (testnet; live blocked)`,
      requirePermission && !hasConfirm
        ? "Reply with 'confirm trade' to place paper order; live blocked."
        : "Not investment advice. Paper/testnet only.",
    ].join("\n");

    params.replyLogger.info(`WhatsApp strategy reply: ${reply.replace(/\n/g, " | ")}`);
    params.echoTracker.rememberText(reply, {});
    await processForRoute(
      { ...msg, body: reply, bodyText: reply } as WebInboundMsg,
      route,
      groupHistoryKey,
      { suppressGroupHistoryClear: true },
    );
    return true;
  };

  return async (msg: WebInboundMsg) => {
    const conversationId = msg.conversationId ?? msg.from;
    const peerId = resolvePeerId(msg);
    // Fresh config for bindings lookup; other routing inputs are payload-derived.
    const route = resolveAgentRoute({
      cfg: loadConfig(),
      channel: "whatsapp",
      accountId: msg.accountId,
      peer: {
        kind: msg.chatType === "group" ? "group" : "direct",
        id: peerId,
      },
    });
    const groupHistoryKey =
      msg.chatType === "group"
        ? buildGroupHistoryKey({
            channel: "whatsapp",
            accountId: route.accountId,
            peerKind: "group",
            peerId,
          })
        : route.sessionKey;

    // Same-phone mode logging retained
    if (msg.from === msg.to) {
      logVerbose(`📱 Same-phone mode detected (from === to: ${msg.from})`);
    }

    // Skip if this is a message we just sent (echo detection)
    if (params.echoTracker.has(msg.body)) {
      logVerbose("Skipping auto-reply: detected echo (message matches recently sent text)");
      params.echoTracker.forget(msg.body);
      return;
    }

    if (msg.chatType === "group") {
      const metaCtx = {
        From: msg.from,
        To: msg.to,
        SessionKey: route.sessionKey,
        AccountId: route.accountId,
        ChatType: msg.chatType,
        ConversationLabel: conversationId,
        GroupSubject: msg.groupSubject,
        SenderName: msg.senderName,
        SenderId: msg.senderJid?.trim() || msg.senderE164,
        SenderE164: msg.senderE164,
        Provider: "whatsapp",
        Surface: "whatsapp",
        OriginatingChannel: "whatsapp",
        OriginatingTo: conversationId,
      } satisfies MsgContext;
      updateLastRouteInBackground({
        cfg: params.cfg,
        backgroundTasks: params.backgroundTasks,
        storeAgentId: route.agentId,
        sessionKey: route.sessionKey,
        channel: "whatsapp",
        to: conversationId,
        accountId: route.accountId,
        ctx: metaCtx,
        warn: params.replyLogger.warn.bind(params.replyLogger),
      });

      const gating = applyGroupGating({
        cfg: params.cfg,
        msg,
        conversationId,
        groupHistoryKey,
        agentId: route.agentId,
        sessionKey: route.sessionKey,
        baseMentionConfig: params.baseMentionConfig,
        authDir: params.account.authDir,
        groupHistories: params.groupHistories,
        groupHistoryLimit: params.groupHistoryLimit,
        groupMemberNames: params.groupMemberNames,
        logVerbose,
        replyLogger: params.replyLogger,
      });
      if (!gating.shouldProcess) {
        return;
      }
    } else {
      // Ensure `peerId` for DMs is stable and stored as E.164 when possible.
      if (!msg.senderE164 && peerId && peerId.startsWith("+")) {
        msg.senderE164 = normalizeE164(peerId) ?? msg.senderE164;
      }
    }

    // Broadcast groups: when we'd reply anyway, run multiple agents.
    // Does not bypass group mention/activation gating above.
    if (
      await maybeBroadcastMessage({
        cfg: params.cfg,
        msg,
        peerId,
        route,
        groupHistoryKey,
        groupHistories: params.groupHistories,
        processMessage: processForRoute,
      })
    ) {
      return;
    }

    const casualHandled = await maybeHandleCasual(msg, route, groupHistoryKey);
    if (casualHandled) {return;}

    const handled = await maybeHandleStrategy(msg, route, groupHistoryKey);
    if (!handled) {
      await processForRoute(msg, route, groupHistoryKey);
    }
  };
}
