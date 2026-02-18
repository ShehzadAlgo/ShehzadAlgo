#!/usr/bin/env node
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();

// Tests to run (defaults to our new volume-profile tests)
const tests = process.argv.slice(2).length ? process.argv.slice(2) : [
  "src/infra/strategy/features/volume-profile.test.ts",
  "src/infra/strategy/features/volume-profile.edge.test.ts",
];

const thresholdMs = Number(process.env.LATENCY_THRESHOLD_MS || process.env.SHEHZADALGO_LATENCY_THRESHOLD_MS || 5000);

function runVitest(args) {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const child = spawn(cmd, ["exec", "vitest", "run", ...args], { stdio: "inherit", shell: false });
    child.on("close", (code) => {
      if (code === 0) resolve(0);
      else reject(new Error("vitest failed with code " + code));
    });
    child.on("error", reject);
  });
}

async function main() {
  const start = Date.now();
  try {
    await runVitest(tests);
  } catch (err) {
    // propagate failure code but still record telemetry
    const ms = Date.now() - start;
    recordResult({ ok: false, ms, error: String(err) });
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(2);
  }
  const ms = Date.now() - start;
  recordResult({ ok: true, ms });
  // eslint-disable-next-line no-console
  console.log(`latency-benchmark: ${ms}ms (threshold ${thresholdMs}ms)`);
  if (ms > thresholdMs) {
    // eslint-disable-next-line no-console
    console.error(`Latency regression: ${ms}ms > ${thresholdMs}ms`);
    process.exit(3);
  }
}

function recordResult(obj) {
  const outDir = process.env.SHEHZADALGO_TELEMETRY_DIR || path.join(repoRoot, "tmp");
  try {
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, "latency-benchmark.jsonl");
    const line = JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n";
    fs.appendFileSync(file, line, "utf8");
  } catch (e) {
    // ignore
  }
}

main();
