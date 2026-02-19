import fs from "node:fs/promises";
import path from "node:path";
import type { PriceBar } from "../../strategy/spec.js";
import { AlertDispatcher, type AlertTarget } from "./alerts.js";
import { CONFIG_DIR, ensureDir } from "../../utils.js";

export type Comparator = ">=" | "<=" | ">" | "<" | "==" | "=";

export type ThresholdRule = {
  id: string;
  symbol: string; // normalized (e.g., BTCUSDT, XAUUSD, EURUSD)
  comparator: Comparator;
  value: number;
  timeframe: string;
  alertTargets: AlertTarget[];
};

export class AlertRuleEngine {
  #rules = new Map<string, ThresholdRule>();
  #persistPath?: string;

  setPersistence(filePath: string) {
    this.#persistPath = filePath;
  }

  async load(): Promise<void> {
    if (!this.#persistPath) {return;}
    try {
      const raw = await fs.readFile(this.#persistPath, "utf8");
      const data = JSON.parse(raw) as ThresholdRule[];
      data.forEach((r) => this.#rules.set(r.id, r));
    } catch {
      // ignore
    }
  }

  async save(): Promise<void> {
    if (!this.#persistPath) {return;}
    try {
      await ensureDir(path.dirname(this.#persistPath));
      await fs.writeFile(this.#persistPath, JSON.stringify(this.list(), null, 2), "utf8");
    } catch {
      // ignore persistence failures
    }
  }

  register(rule: ThresholdRule) {
    this.#rules.set(rule.id, rule);
    void this.save();
  }

  remove(ruleId: string) {
    this.#rules.delete(ruleId);
    void this.save();
  }

  list(): ThresholdRule[] {
    return Array.from(this.#rules.values());
  }

  async evaluate(bar: PriceBar, symbol: string) {
    const matches = Array.from(this.#rules.values()).filter(
      (r) => r.symbol === symbol && r.timeframe === (bar as any).timeframe,
    );
    for (const rule of matches) {
      if (this.#compare(bar.close, rule.comparator, rule.value)) {
        const dispatcher = new AlertDispatcher(rule.alertTargets);
        await dispatcher.send({
          title: `${symbol} ${rule.comparator} ${rule.value}`,
          body: `Close ${bar.close.toFixed(4)} hit your alert (${rule.timeframe}).`,
        });
        // one-shot by default; can be extended to persistent later
        this.#rules.delete(rule.id);
        void this.save();
      }
    }
  }

  #compare(lhs: number, cmp: Comparator, rhs: number): boolean {
    switch (cmp) {
      case ">": return lhs > rhs;
      case ">=": return lhs >= rhs;
      case "<": return lhs < rhs;
      case "<=": return lhs <= rhs;
      case "=":
      case "==": return lhs === rhs;
      default: return false;
    }
  }
}

export const globalAlertRules = new AlertRuleEngine();
globalAlertRules.setPersistence(path.join(CONFIG_DIR, "alerts.json"));
void globalAlertRules.load();
