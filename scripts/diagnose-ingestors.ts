#!/usr/bin/env node
// Diagnostic script to test ingest providers (Binance, Dukascopy)
// Run with: `node --import tsx scripts/diagnose-ingestors.ts`

import { BinanceIngestor } from "../src/infra/strategy/ingest/binance.ts";
import { DukascopyHttpIngestor } from "../src/infra/strategy/ingest/dukascopy-fetch.ts";
import { runQualityChecks } from "../src/infra/strategy/ingest.ts";

async function testIngestor(name: string, ingestor: any, params: any) {
  try {
    const res = await ingestor.fetchBars(params);
    const count = res.bars?.length ?? 0;
    const qc = count > 0 ? runQualityChecks(res.bars) : { ok: true, issues: [] };
    const out = {
      name,
      count,
      errors: res.errors ?? [],
      warnings: res.warnings ?? [],
      quality: qc.ok ? "ok" : "issues",
      issues: qc.issues ?? [],
      sample: res.bars?.slice(0, 3) ?? [],
    };
    // print summary (human friendly) only when not json-only
    if (!(globalThis as any).__DIAG_JSON_ONLY__) {
      console.log(`\n== ${name} ==`);
      console.log(`bars: ${out.count}`);
      if (out.errors.length) console.log(`errors: ${out.errors.join("; ")}`);
      if (out.warnings.length) console.log(`warnings: ${out.warnings.join("; ")}`);
      if (out.count > 0) {
        console.log(`quality: ${out.quality}`);
        if (out.issues.length) out.issues.forEach((i: any) => console.log(` - ${i.type}: ${i.description}`));
        console.log("sample:", JSON.stringify(out.sample, null, 2));
      }
    }
    return out;
  } catch (err) {
    const msg = (err as Error).message;
    if (!(globalThis as any).__DIAG_JSON_ONLY__) {
      console.log(`\n== ${name} ==`);
      console.log(`exception: ${msg}`);
    }
    return { name, count: 0, errors: [msg], warnings: [], quality: "error", issues: [], sample: [] };
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const out: any = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      out.help = true;
      break;
    }
    if (!a.startsWith("--")) continue;
    const key = a.replace(/^--/, "");
    const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[key] = val;
  }
  return out;
}

function showHelp() {
  console.log(`Usage: node --import tsx scripts/diagnose-ingestors.ts [options]\n
Options:
  --binanceSymbol SYMBOL   comma-separated (default BTCUSDT)
  --dukascopySymbols LIST  comma-separated (default EURUSD,XAUUSD)
  --timeframe TF           timeframe (default 1m)
  --start ISO              start time (ISO)
  --end ISO                end time (ISO)
  --limit N                max bars per provider (default 200)
  --json                   emit JSON result
  --help, -h               show this help
`);
}

async function main() {
  const args = parseArgs();
  // set a global flag used by testIngestor to suppress human output when requested
  (globalThis as any).__DIAG_JSON_ONLY__ = Boolean(args["json-only"] || args.jsonOnly || args.json);
  if (args.help) { showHelp(); return; }
  const binanceSym = (args.binanceSymbol ?? "BTCUSDT").split(",").map((s: string) => s.trim()).filter(Boolean);
  const dukS = (args.dukascopySymbols ?? "EURUSD,XAUUSD").split(",").map((s: string) => s.trim()).filter(Boolean);
  const timeframe = args.timeframe ?? "1m";
  const limit = args.limit ? Number(args.limit) : 200;
  const start = args.start ? new Date(args.start) : null;
  const end = args.end ? new Date(args.end) : null;

  const binance = new BinanceIngestor();
  const duk = new DukascopyHttpIngestor();

  const results: any[] = [];

  // Binance tests
  for (const s of binanceSym) {
    const now = end ?? new Date();
    const st = start ?? new Date(now.getTime() - 5 * 60 * 1000);
    const res = await testIngestor(`Binance (${s} ${timeframe})`, binance, {
      symbol: s,
      timeframe,
      start: st.toISOString(),
      end: now.toISOString(),
      limit: Math.min(limit, 500),
    });
    results.push(res);
  }

  // Dukascopy tests
  for (const s of dukS) {
    const st = start ?? new Date(Date.UTC(2026, 1, 17, 0, 0, 0));
    const ed = end ?? new Date(Date.UTC(2026, 1, 19, 0, 0, 0));
    const res = await testIngestor(`Dukascopy (${s} ${timeframe})`, duk, {
      symbol: s,
      timeframe,
      start: st.toISOString(),
      end: ed.toISOString(),
      limit,
    });
    results.push(res);
  }

  if (args.json) {
    console.log(JSON.stringify({ results }, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
