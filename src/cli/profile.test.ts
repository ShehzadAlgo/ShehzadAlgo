import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "shehzadalgo",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "shehzadalgo", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "shehzadalgo", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "shehzadalgo", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "shehzadalgo", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "shehzadalgo", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "shehzadalgo", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "shehzadalgo", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "shehzadalgo", "--profile", "work", "--dev", "status"]);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".shehzadalgo-dev");
    expect(env.shehzadalgo_PROFILE).toBe("dev");
    expect(env.shehzadalgo_STATE_DIR).toBe(expectedStateDir);
    expect(env.shehzadalgo_CONFIG_PATH).toBe(path.join(expectedStateDir, "shehzadalgo.json"));
    expect(env.shehzadalgo_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      shehzadalgo_STATE_DIR: "/custom",
      shehzadalgo_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.shehzadalgo_STATE_DIR).toBe("/custom");
    expect(env.shehzadalgo_GATEWAY_PORT).toBe("19099");
    expect(env.shehzadalgo_CONFIG_PATH).toBe(path.join("/custom", "shehzadalgo.json"));
  });

  it("uses shehzadalgo_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      shehzadalgo_HOME: "/srv/shehzadalgo-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/shehzadalgo-home");
    expect(env.shehzadalgo_STATE_DIR).toBe(path.join(resolvedHome, ".shehzadalgo-work"));
    expect(env.shehzadalgo_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".shehzadalgo-work", "shehzadalgo.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("shehzadalgo doctor --fix", {})).toBe("shehzadalgo doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("shehzadalgo doctor --fix", { shehzadalgo_PROFILE: "default" })).toBe(
      "shehzadalgo doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("shehzadalgo doctor --fix", { shehzadalgo_PROFILE: "Default" })).toBe(
      "shehzadalgo doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("shehzadalgo doctor --fix", { shehzadalgo_PROFILE: "bad profile" })).toBe(
      "shehzadalgo doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(
      formatCliCommand("shehzadalgo --profile work doctor --fix", { shehzadalgo_PROFILE: "work" }),
    ).toBe("shehzadalgo --profile work doctor --fix");
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("shehzadalgo --dev doctor", { shehzadalgo_PROFILE: "dev" })).toBe(
      "shehzadalgo --dev doctor",
    );
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("shehzadalgo doctor --fix", { shehzadalgo_PROFILE: "work" })).toBe(
      "shehzadalgo --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("shehzadalgo doctor --fix", { shehzadalgo_PROFILE: "  jbshehzadalgo  " })).toBe(
      "shehzadalgo --profile jbshehzadalgo doctor --fix",
    );
  });

  it("handles command with no args after shehzadalgo", () => {
    expect(formatCliCommand("shehzadalgo", { shehzadalgo_PROFILE: "test" })).toBe(
      "shehzadalgo --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm shehzadalgo doctor", { shehzadalgo_PROFILE: "work" })).toBe(
      "pnpm shehzadalgo --profile work doctor",
    );
  });
});
