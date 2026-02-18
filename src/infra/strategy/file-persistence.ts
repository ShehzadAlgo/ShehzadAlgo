import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BacktestResult } from "../../strategy/spec.js";
import type { Persistence } from "./persistence.js";

const DEFAULT_DIR = join(process.env.HOME || process.cwd(), ".cache", "shehzadalgo", "backtests");

export class FilePersistence implements Persistence {
  #dir: string;
  constructor(dir = DEFAULT_DIR) {
    this.#dir = dir;
  }

  async saveBacktest(result: { equity: unknown; trades: unknown }): Promise<{ equityRef: string; tradesRef: string }> {
    await mkdir(this.#dir, { recursive: true });
    const stamp = Date.now();
    const equityRef = join(this.#dir, `equity-${stamp}.json`);
    const tradesRef = join(this.#dir, `trades-${stamp}.json`);
    await writeFile(equityRef, JSON.stringify(result.equity), "utf8");
    await writeFile(tradesRef, JSON.stringify(result.trades), "utf8");
    return { equityRef, tradesRef };
  }

  // Load not needed for current flow; implement if required later.
  // eslint-disable-next-line @typescript-eslint/class-methods-use-this
  loadBacktest(_refs: { equityRef: string; tradesRef: string }): BacktestResult | null {
    return null;
  }
}
