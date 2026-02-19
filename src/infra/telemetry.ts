import fs from "node:fs";
import path from "node:path";

const OUT_DIR = process.env.SHEHZADALGO_TELEMETRY_DIR ?? path.join(process.cwd(), "tmp");
try {
  fs.mkdirSync(OUT_DIR, { recursive: true });
} catch {}

export async function measureMs<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await fn();
  const ms = Date.now() - start;
  record({ type: "timing", name, ms, ts: new Date().toISOString() });
  return { result, ms };
}

export function record(obj: Record<string, unknown>) {
  const line = JSON.stringify(obj) + "\n";
  try {
    fs.appendFileSync(path.join(OUT_DIR, "telemetry.jsonl"), line, "utf8");
  } catch (err) {
    // Best-effort; don't throw in CI
    // eslint-disable-next-line no-console
    console.warn("telemetry write failed:", err?.toString?.() ?? err);
  }
}

export function readTelemetryLines(): string[] {
  try {
    const p = path.join(OUT_DIR, "telemetry.jsonl");
    if (!fs.existsSync(p)) {
      return [];
    }
    return fs.readFileSync(p, "utf8").split(/\n/).filter(Boolean);
  } catch {
    return [];
  }
}

export default { measureMs, record, readTelemetryLines };
