import type { IngestResult, Ingestor, IngestSourceConfig, NormalizedBar } from "../ingest.js";
import type { Timeframe } from "../../../strategy/spec.js";

const klineMap: Record<Timeframe, string | undefined> = {
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

export class BinanceIngestor implements Ingestor {
  readonly config: IngestSourceConfig = {
    id: "binance",
    venues: ["binance"],
    supportsTimeframes: Object.keys(klineMap).filter((k) => Boolean(klineMap[k as Timeframe])) as Timeframe[],
    supportsOrderBook: true,
  };

  async fetchBars(params: {
    symbol: string;
    venue?: string;
    timeframe: Timeframe;
    start: string;
    end: string;
    limit?: number;
    page?: string;
  }): Promise<IngestResult> {
    const interval = klineMap[params.timeframe];
    if (!interval) {return { bars: [], warnings: ["unsupported timeframe for Binance"] };}

    const url = new URL("https://api.binance.com/api/v3/klines");
    url.searchParams.set("symbol", params.symbol.toUpperCase());
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(params.limit ?? 500));
    if (params.start) {url.searchParams.set("startTime", String(new Date(params.start).getTime()));}
    if (params.end) {url.searchParams.set("endTime", String(new Date(params.end).getTime()));}

    try {
      const res = await fetch(url);
      if (!res.ok) {return { bars: [], errors: [`${res.status}: ${await res.text()}`] };}
      const raw = (await res.json()) as any[];
      const bars: NormalizedBar[] = raw.map((k) => ({
        ts: new Date(k[0]).toISOString(),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
        venue: "binance",
        symbol: params.symbol,
        assetClass: "crypto",
      }));
      return { bars };
    } catch (error) {
      return { bars: [], errors: [(error as Error).message] };
    }
  }
}
