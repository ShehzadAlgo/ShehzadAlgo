import type { ShehzadAlgoConfig } from "../config/config.js";

export function applyOnboardingLocalWorkspaceConfig(
  baseConfig: ShehzadAlgoConfig,
  workspaceDir: string,
): ShehzadAlgoConfig {
  return {
    ...baseConfig,
    agents: {
      ...baseConfig.agents,
      defaults: {
        ...baseConfig.agents?.defaults,
        workspace: workspaceDir,
      },
    },
    gateway: {
      ...baseConfig.gateway,
      mode: "local",
    },
  };
}
