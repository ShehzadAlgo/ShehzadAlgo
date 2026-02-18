import type { ShehzadAlgoPluginApi } from "shehzadalgo/plugin-sdk";
import { emptyPluginConfigSchema } from "shehzadalgo/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: ShehzadAlgoPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
