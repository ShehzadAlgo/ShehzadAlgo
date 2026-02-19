import type { IngestResult, Ingestor, IngestSourceConfig, NormalizedBar } from "../ingest.js";
import type { Timeframe } from "../../../strategy/spec.js";

// Lightweight Dukascopy CSV fetcher (per-day gzip CSV). For production, add caching + retries.
// Endpoint pattern: https://datafeed.dukascopy.com/datafeed/{symbol}/{YYYY}/{MM-1}/{DD}/{hh}h_ticks.bi5 for ticks
// Here we use minute bars API: https://freeserv.dukascopy.com/2.0/pa/{symbol}/{tf}/{YYYY}/{MM}/{DD}
export class DukascopyHttpIngestor implements Ingestor {
  readonly config: IngestSourceConfig = {
    id: "dukascopy-http",
    venues: ["dukascopy"],
    supportsTimeframes: ["1m", "5m", "15m", "30m", "1h", "4h", "1d"],
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
    const tfMap: Record<Timeframe, string | undefined> = {
      "1m": "1m",
      "3m": undefined,
      "5m": "5m",
      "15m": "15m",
      "30m": "30m",
      "1h": "60m",
      "2h": undefined,
      "4h": "4h",
      "6h": undefined,
      "12h": undefined,
      "1d": "1D",
    };
    const tf = tfMap[params.timeframe];
    if (!tf) {return { bars: [], warnings: ["unsupported timeframe for Dukascopy"] };}

    // API: https://freeserv.dukascopy.com/2.0/pa/{pair}/{tf}/{YYYY}/{MM}/{DD}
    // Dukascopy months are 1-based; ensure uppercase pair (e.g., EURUSD, XAUUSD)
    const start = new Date(params.start);
    const end = new Date(params.end);
    const bars: NormalizedBar[] = [];

    for (
      let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      cursor <= end;
      cursor = new Date(cursor.getTime() + 24 * 3600 * 1000)
    ) {
      const y = cursor.getUTCFullYear();
      const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cursor.getUTCDate()).padStart(2, "0");
      const url = `https://freeserv.dukascopy.com/2.0/pa/${params.symbol.toUpperCase()}/${tf}/${y}/${m}/${d}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          // Dukascopy returns 404 when no data; skip quietly.
          continue;
        }
        const json = (await res.json()) as any[];
        json.forEach((row) => {
          // row shape: [timestamp(ms), open, high, low, close, volume]
          bars.push({
            ts: new Date(row[0]).toISOString(),
            open: Number(row[1]),
            high: Number(row[2]),
            low: Number(row[3]),
            close: Number(row[4]),
            volume: Number(row[5] ?? 0),
            venue: "dukascopy",
            symbol: params.symbol,
            assetClass: "fx",
          });
        });
      } catch (err) {
        return { bars: [], errors: [(err as Error).message] };
      }
      if (params.limit && bars.length >= params.limit) {break;}
    }

    if (params.limit && bars.length > params.limit) {
      bars.splice(params.limit);
    }
    return { bars };
  }
}
