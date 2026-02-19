import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDefaultConfigCandidates,
  resolveConfigPathCandidate,
  resolveConfigPath,
  resolveOAuthDir,
  resolveOAuthPath,
  resolveStateDir,
} from "./paths.js";

describe("oauth paths", () => {
  it("prefers SHEHZADALGO_OAUTH_DIR over SHEHZADALGO_STATE_DIR", () => {
    const env = {
      SHEHZADALGO_OAUTH_DIR: "/custom/oauth",
      SHEHZADALGO_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.resolve("/custom/oauth"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join(path.resolve("/custom/oauth"), "oauth.json"),
    );
  });

  it("derives oauth path from SHEHZADALGO_STATE_DIR when unset", () => {
    const env = {
      SHEHZADALGO_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.join("/custom/state", "credentials"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join("/custom/state", "credentials", "oauth.json"),
    );
  });
});

describe("state + config path candidates", () => {
  it("uses SHEHZADALGO_STATE_DIR when set", () => {
    const env = {
      SHEHZADALGO_STATE_DIR: "/new/state",
    } as NodeJS.ProcessEnv;

    expect(resolveStateDir(env, () => "/home/test")).toBe(path.resolve("/new/state"));
  });

  it("uses SHEHZADALGO_HOME for default state/config locations", () => {
    const env = {
      SHEHZADALGO_HOME: "/srv/shehzadalgo-home",
    } as NodeJS.ProcessEnv;

    const resolvedHome = path.resolve("/srv/shehzadalgo-home");
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".shehzadalgo"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".shehzadalgo", "shehzadalgo.json"));
  });

  it("prefers SHEHZADALGO_HOME over HOME for default state/config locations", () => {
    const env = {
      SHEHZADALGO_HOME: "/srv/shehzadalgo-home",
      HOME: "/home/other",
    } as NodeJS.ProcessEnv;

    const resolvedHome = path.resolve("/srv/shehzadalgo-home");
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".shehzadalgo"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".shehzadalgo", "shehzadalgo.json"));
  });

  it("orders default config candidates in a stable order", () => {
    const home = "/home/test";
    const resolvedHome = path.resolve(home);
    const candidates = resolveDefaultConfigCandidates({} as NodeJS.ProcessEnv, () => home);
    const expected = [
      path.join(resolvedHome, ".shehzadalgo", "shehzadalgo.json"),
      path.join(resolvedHome, ".shehzadalgo", "shehzadalgo.json"),
      path.join(resolvedHome, ".shehzadalgo", "moldbot.json"),
      path.join(resolvedHome, ".shehzadalgo", "moltbot.json"),
      path.join(resolvedHome, ".shehzadalgo", "shehzadalgo.json"),
      path.join(resolvedHome, ".shehzadalgo", "shehzadalgo.json"),
      path.join(resolvedHome, ".shehzadalgo", "moldbot.json"),
      path.join(resolvedHome, ".shehzadalgo", "moltbot.json"),
      path.join(resolvedHome, ".moldbot", "shehzadalgo.json"),
      path.join(resolvedHome, ".moldbot", "shehzadalgo.json"),
      path.join(resolvedHome, ".moldbot", "moldbot.json"),
      path.join(resolvedHome, ".moldbot", "moltbot.json"),
      path.join(resolvedHome, ".moltbot", "shehzadalgo.json"),
      path.join(resolvedHome, ".moltbot", "shehzadalgo.json"),
      path.join(resolvedHome, ".moltbot", "moldbot.json"),
      path.join(resolvedHome, ".moltbot", "moltbot.json"),
    ];
    expect(candidates).toEqual(expected);
  });

  it("prefers ~/.shehzadalgo when it exists and legacy dir is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "shehzadalgo-state-"));
    try {
      const newDir = path.join(root, ".shehzadalgo");
      await fs.mkdir(newDir, { recursive: true });
      const resolved = resolveStateDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("CONFIG_PATH prefers existing config when present", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "shehzadalgo-config-"));
    try {
      const legacyDir = path.join(root, ".shehzadalgo");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyPath = path.join(legacyDir, "shehzadalgo.json");
      await fs.writeFile(legacyPath, "{}", "utf-8");

      const resolved = resolveConfigPathCandidate({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(legacyPath);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("respects state dir overrides when config is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "shehzadalgo-config-override-"));
    try {
      const legacyDir = path.join(root, ".shehzadalgo");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyConfig = path.join(legacyDir, "shehzadalgo.json");
      await fs.writeFile(legacyConfig, "{}", "utf-8");

      const overrideDir = path.join(root, "override");
      const env = { SHEHZADALGO_STATE_DIR: overrideDir } as NodeJS.ProcessEnv;
      const resolved = resolveConfigPath(env, overrideDir, () => root);
      expect(resolved).toBe(path.join(overrideDir, "shehzadalgo.json"));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
