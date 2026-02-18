import { setTimeout as delay } from "node:timers/promises";

export type AlertChannel = "telegram" | "whatsapp";

export interface AlertTarget {
  channel: AlertChannel;
  chatId?: string; // telegram chat id
}

export interface SignalAlert {
  title: string;
  body: string;
}

export class AlertDispatcher {
  constructor(private readonly targets: AlertTarget[]) {}

  async send(alert: SignalAlert): Promise<void> {
    const tasks = this.targets.map((t) => this.#sendOne(t, alert));
    await Promise.allSettled(tasks);
  }

  async #sendOne(target: AlertTarget, alert: SignalAlert): Promise<void> {
    switch (target.channel) {
      case "telegram":
        await this.#sendTelegram(target, alert);
        break;
      case "whatsapp":
        // WhatsApp sending is handled via gateway channels in the main app;
        // placeholder log here to avoid silent drops.
        console.info(`[alert][whatsapp] ${alert.title}: ${alert.body}`);
        break;
      default:
        break;
    }
  }

  async #sendTelegram(target: AlertTarget, alert: SignalAlert): Promise<void> {
    const token = process.env.SHEHZADALGO_TELEGRAM_BOT_TOKEN?.trim();
    const chatId = target.chatId ?? process.env.SHEHZADALGO_TELEGRAM_CHAT_ID?.trim();
    if (!token || !chatId) {
      console.info("[alert][telegram] skipped (missing token/chatId)");
      return;
    }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: `🚨 ${alert.title}\n${alert.body}`,
      parse_mode: "Markdown",
    };
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return;
      }
      await delay(300 * (attempt + 1));
    }
    console.warn("[alert][telegram] failed after retries");
  }
}
