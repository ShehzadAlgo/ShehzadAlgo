import { createSubsystemLogger } from "../logging/subsystem.js";
import { parseBooleanValue } from "../utils/boolean.js";

const log = createSubsystemLogger("env");
const loggedEnv = new Set<string>();

type AcceptedEnvOption = {
  key: string;
  description: string;
  value?: string;
  redact?: boolean;
};

function formatEnvValue(value: string, redact?: boolean): string {
  if (redact) {
    return "<redacted>";
  }
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 160) {
    return singleLine;
  }
  return `${singleLine.slice(0, 160)}…`;
}

export function logAcceptedEnvOption(option: AcceptedEnvOption): void {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }
  if (loggedEnv.has(option.key)) {
    return;
  }
  const rawValue = option.value ?? process.env[option.key];
  if (!rawValue || !rawValue.trim()) {
    return;
  }
  loggedEnv.add(option.key);
  log.info(`env: ${option.key}=${formatEnvValue(rawValue, option.redact)} (${option.description})`);
}

export function normalizeZaiEnv(): void {
  if (!process.env.ZAI_API_KEY?.trim() && process.env.Z_AI_API_KEY?.trim()) {
    process.env.ZAI_API_KEY = process.env.Z_AI_API_KEY;
  }
}

function copyPrefixedEnv(srcPrefix: string, destPrefix: string): void {
  for (const key of Object.keys(process.env)) {
    if (!key.startsWith(srcPrefix)) {continue;}
    const suffix = key.slice(srcPrefix.length);
    const destKey = `${destPrefix}${suffix}`;
    if (!process.env[destKey]) {
      process.env[destKey] = process.env[key];
    }
  }
}

export function isTruthyEnvValue(value?: string): boolean {
  return parseBooleanValue(value) === true;
}

export function normalizeEnv(): void {
  normalizeZaiEnv();
  // Branding migration: prefer SHEHZADALGO_*, but keep SHEHZADALGO_* working.
  copyPrefixedEnv("SHEHZADALGO_", "shehzadalgo_");
  copyPrefixedEnv("SHEHZADALGO_", "shehzadalgo_");
  // Mirror lower-case to upper-case so downstream tools logging uppercase find it.
  copyPrefixedEnv("shehzadalgo_", "SHEHZADALGO_");
}
