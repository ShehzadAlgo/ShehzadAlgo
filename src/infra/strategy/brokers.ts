import type { ExecuteOrderRequest } from "../../strategy/spec.js";

export interface BrokerAdapter {
  id: string; // e.g. "mt5", "binance"
  canPaperTrade: boolean;
  execute(request: ExecuteOrderRequest): Promise<{ orderId: string; status: string; warnings?: string[] }>;
}

export class NoopBrokerAdapter implements BrokerAdapter {
  id = "noop";
  canPaperTrade = true;
  async execute(request: ExecuteOrderRequest) {
    return { orderId: `noop-${request.symbol}`, status: "not-implemented", warnings: ["broker adapter not implemented"] };
  }
}

export class BrokerRegistry {
  #adapters: Map<string, BrokerAdapter> = new Map();
  register(adapter: BrokerAdapter) {
    this.#adapters.set(adapter.id, adapter);
  }
  get(id: string): BrokerAdapter | undefined {
    return this.#adapters.get(id);
  }
}
