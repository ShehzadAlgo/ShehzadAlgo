import type { Command } from "commander";
import { strategyBacktest, strategyExecute, strategyExport, strategySearch, strategyWatch } from "../../commands/strategy.js";
import { defaultRuntime } from "../../runtime.js";
import { runCommandWithRuntime } from "../cli-utils.js";

export function registerStrategyCommand(program: Command) {
  const cmd = program.command("strategy").description("Search, backtest, export, and execute strategies");

  cmd
    .command("search <prompt>")
    .description("Find strategy templates that match a prompt")
    .action(async (prompt: string) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const results = strategySearch(prompt);
        defaultRuntime.log(JSON.stringify(results, null, 2));
      });
    });

  cmd
    .command("export <templateId>")
    .description("Export a strategy template to Pine/internal DSL")
    .option("--param <key=value...>", "Override template param (repeatable)")
    .action(async (templateId: string, opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const paramList: string[] | undefined = opts.param
          ? Array.isArray(opts.param)
            ? opts.param
            : [opts.param]
          : undefined;
        const params: Record<string, number> = {};
        paramList?.forEach((entry) => {
          const [k, v] = String(entry).split("=");
          if (k && v && !Number.isNaN(Number(v))) {
            params[k] = Number(v);
          }
        });
        const result = await strategyExport(templateId, params);
        defaultRuntime.log(JSON.stringify(result, null, 2));
      });
    });

  cmd
    .command("backtest <specJson>")
    .description("Run backtest from a StrategySpec JSON string")
    .action(async (specJson: string) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const parsed = JSON.parse(specJson);
        const result = await strategyBacktest(parsed);
        defaultRuntime.log(JSON.stringify(result, null, 2));
      });
    });

  cmd
    .command("execute <orderJson>")
    .description("Execute an order via broker adapter (noop by default)")
    .action(async (orderJson: string) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const parsed = JSON.parse(orderJson);
        const result = await strategyExecute(parsed);
        defaultRuntime.log(JSON.stringify(result, null, 2));
      });
    });

  cmd
    .command("watch <symbol>")
    .description("Start a streaming watcher and push alerts on bar close (Binance)")
    .option(
      "-t, --timeframes <list>",
      "Comma-separated timeframes (e.g. 1m,5m,15m,1h,4h,1d)",
      "1m,5m,15m,1h,4h,1d",
    )
    .option("--telegram-chat <id>", "Telegram chat id for alerts")
    .action(async (symbol: string, opts) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        const alertTargets = [
          { channel: "telegram" as const, chatId: opts.telegramChat as string | undefined },
          { channel: "whatsapp" as const },
        ];
        await strategyWatch({
          symbol,
          timeframes: String(opts.timeframes)
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean) as any[],
          venue: "binance",
          alertTargets,
        });
      });
    });
}
