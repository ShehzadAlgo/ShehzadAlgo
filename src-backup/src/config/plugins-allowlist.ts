import type { ShehzadAlgoConfig } from "./config.js";

export function ensurePluginAllowlisted(cfg: ShehzadAlgoConfig, pluginId: string): ShehzadAlgoConfig {
  const allow = cfg.plugins?.allow;
  if (!Array.isArray(allow) || allow.includes(pluginId)) {
    return cfg;
  }
  return {
    ...cfg,
    plugins: {
      ...cfg.plugins,
      allow: [...allow, pluginId],
    },
  };
}
