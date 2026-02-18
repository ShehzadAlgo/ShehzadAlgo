import WebSocket from "ws";
import { EventEmitter } from "node:events";
import type { PriceBar, Timeframe, AssetClass } from "../../strategy/spec.js";
import { fetchAlpacaLatestBar } from "./providers/alpaca.js";
import { fetchMt5LatestBar } from "./providers/mt5.js";

export type StreamVenue = "binance" | "alpaca" | "mt5";

export type StreamSubscription = {
  venue: StreamVenue;
  symbol: string; // e.g. BTCUSDT
  timeframe: Timeframe; // mapped to provider interval
  assetClass: AssetClass;
};

export type BarEvent = {
  sub: StreamSubscription;
  bar: PriceBar;
  sourceTs: number;
};

const BINANCE_INTERVALS: Record<Timeframe, string> = {
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "15m": "15m",
  "30m": "30m",
  "1h": "1h",
  "2h": "2h",
  "4h": "4h",
  "6h": "6h",
  "12h": "12h",
  "1d": "1d",
};

export class StreamingWatcher extends EventEmitter {
  #ws?: WebSocket;
  #subs = new Map<string, StreamSubscription>();
  #started = false;
  #pendingSubs: string[] = [];
  #pollers = new Map<string, NodeJS.Timeout>();

  start() {
    if (this.#started) {return;}
    this.#started = true;
    this.#connect();
    this.#startPollers();
  }

  stop() {
    this.#started = false;
    this.#ws?.close();
    this.#ws = undefined;
    this.#stopPollers();
  }

  subscribe(sub: StreamSubscription) {
    const key = this.#key(sub);
    this.#subs.set(key, sub);
    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      this.#ws.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: [this.#binanceStream(sub)],
          id: Date.now(),
        }),
      );
    } else {
      this.#pendingSubs.push(this.#binanceStream(sub));
    }
  }

  unsubscribe(sub: StreamSubscription) {
    const key = this.#key(sub);
    this.#subs.delete(key);
    if (this.#ws && this.#ws.readyState === WebSocket.OPEN) {
      this.#ws.send(
        JSON.stringify({
          method: "UNSUBSCRIBE",
          params: [this.#binanceStream(sub)],
          id: Date.now(),
        }),
      );
    }
  }

  #connect() {
    // Only Binance uses WS; others are polled.
    const streams = Array.from(this.#subs.values()).map((s) => this.#binanceStream(s));
    const url =
      streams.length > 0
        ? `wss://stream.binance.com:9443/stream?streams=${streams.join("/")}`
        : "wss://stream.binance.com:9443/ws";
    this.#ws = new WebSocket(url);

    this.#ws.on("open", () => {
      const params = [...streams, ...this.#pendingSubs];
      this.#pendingSubs = [];
      if (params.length === 0) {return;}
      this.#ws?.send(JSON.stringify({ method: "SUBSCRIBE", params, id: Date.now() }));
    });

    this.#ws.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as
          | { stream?: string; data?: { k?: BinanceKline } }
          | { result?: unknown };
        const streamName = (parsed as { stream?: string }).stream ?? "";
        const k = (parsed as { data?: { k?: BinanceKline } }).data?.k;
        if (!k || !k.x) {return;} // only closed candles
        const sub = this.#subFromStream(streamName);
        if (!sub) {return;}
        const bar: PriceBar = {
          ts: new Date(k.t).toISOString(),
          open: Number(k.o),
          high: Number(k.h),
          low: Number(k.l),
          close: Number(k.c),
          volume: Number(k.v),
          timeframe: sub.timeframe as any,
        };
        this.emit("bar", { sub, bar, sourceTs: Date.now() } satisfies BarEvent);
      } catch {
        // ignore malformed frames
      }
    });

    this.#ws.on("close", () => {
      if (this.#started) {
        setTimeout(() => this.#connect(), 1_000);
      }
    });
  }

  #binanceStream(sub: StreamSubscription): string {
    const interval = BINANCE_INTERVALS[sub.timeframe];
    return `${sub.symbol.toLowerCase()}@kline_${interval}`;
  }

  #subFromStream(stream: string): StreamSubscription | null {
    const [pair, frame] = stream.split("@kline_");
    if (!pair || !frame) {return null;}
    const timeframe = Object.entries(BINANCE_INTERVALS).find(([, v]) => v === frame)?.[0] as
      | Timeframe
      | undefined;
    if (!timeframe) {return null;}
    const match = Array.from(this.#subs.values()).find(
      (s) => s.symbol.toLowerCase() === pair.toLowerCase() && s.timeframe === timeframe,
    );
    return match ?? null;
  }

  #key(sub: StreamSubscription) {
    return `${sub.venue}:${sub.symbol}:${sub.timeframe}`;
  }

  #startPollers() {
    this.#stopPollers();
    for (const sub of this.#subs.values()) {
      if (sub.venue === "alpaca") {
        const key = this.#key(sub);
        const timer = setInterval(async () => {
          const bar = await fetchAlpacaLatestBar(sub.symbol, sub.timeframe);
          if (bar) {
            this.emit("bar", {
              sub,
              bar: { ...bar, timeframe: sub.timeframe },
              sourceTs: Date.now(),
            } satisfies BarEvent);
          }
        }, 30_000); // 30s poll
        this.#pollers.set(key, timer);
        continue;
      }
      if (sub.venue === "mt5") {
        const key = this.#key(sub);
        const timer = setInterval(async () => {
          const bar = await fetchMt5LatestBar(sub.symbol, sub.timeframe);
          if (bar) {
            this.emit("bar", {
              sub,
              bar: { ...bar, timeframe: sub.timeframe },
              sourceTs: Date.now(),
            } satisfies BarEvent);
          }
        }, 30_000);
        this.#pollers.set(key, timer);
      }
    }
  }

  #stopPollers() {
    for (const t of this.#pollers.values()) {
      clearInterval(t);
    }
    this.#pollers.clear();
  }
}

type BinanceKline = {
  t: number; // start time
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
  x: boolean; // closed
};
