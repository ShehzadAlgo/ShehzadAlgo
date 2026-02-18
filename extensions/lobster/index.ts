import type {
  AnyAgentTool,
  ShehzadAlgoPluginApi,
  ShehzadAlgoPluginToolFactory,
} from "../../src/plugins/types.js";
import { createLobsterTool } from "./src/lobster-tool.js";

export default function register(api: ShehzadAlgoPluginApi) {
  api.registerTool(
    ((ctx) => {
      if (ctx.sandboxed) {
        return null;
      }
      return createLobsterTool(api) as AnyAgentTool;
    }) as ShehzadAlgoPluginToolFactory,
    { optional: true },
  );
}
