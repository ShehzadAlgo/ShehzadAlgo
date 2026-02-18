import type { LiveSignal, StrategySpec } from "../../strategy/spec.js";

export interface LiveRunner {
  start(spec: StrategySpec): Promise<void>;
  stop(specId: string): Promise<void>;
  onSignal(callback: (signal: LiveSignal) => void): void;
}

export class NoopLiveRunner implements LiveRunner {
  #callback?: (signal: LiveSignal) => void;

  async start(spec: StrategySpec): Promise<void> {
    // placeholder: emit nothing
    void spec;
  }

  async stop(specId: string): Promise<void> {
    void specId;
  }

  onSignal(callback: (signal: LiveSignal) => void): void {
    this.#callback = callback;
  }
}
