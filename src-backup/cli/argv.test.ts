import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "shehzadalgo", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "shehzadalgo", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "shehzadalgo", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "shehzadalgo", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "shehzadalgo", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "shehzadalgo", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "shehzadalgo", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "shehzadalgo"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "shehzadalgo", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "shehzadalgo", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "shehzadalgo", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "shehzadalgo", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "shehzadalgo", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "shehzadalgo", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "shehzadalgo", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "shehzadalgo", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "shehzadalgo", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "shehzadalgo", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "shehzadalgo", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "shehzadalgo", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "shehzadalgo", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "shehzadalgo", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["node", "shehzadalgo", "status"],
    });
    expect(nodeArgv).toEqual(["node", "shehzadalgo", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["node-22", "shehzadalgo", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "shehzadalgo", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["node-22.2.0.exe", "shehzadalgo", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "shehzadalgo", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["node-22.2", "shehzadalgo", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "shehzadalgo", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["node-22.2.exe", "shehzadalgo", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "shehzadalgo", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["/usr/bin/node-22.2.0", "shehzadalgo", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "shehzadalgo", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["nodejs", "shehzadalgo", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "shehzadalgo", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["node-dev", "shehzadalgo", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "shehzadalgo", "node-dev", "shehzadalgo", "status"]);

    const directArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["shehzadalgo", "status"],
    });
    expect(directArgv).toEqual(["node", "shehzadalgo", "status"]);

    const bunArgv = buildParseArgv({
      programName: "shehzadalgo",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "shehzadalgo",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "shehzadalgo", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "shehzadalgo", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "config", "get", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "config", "unset", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "models", "list"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "models", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "shehzadalgo", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "shehzadalgo", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["config", "get"])).toBe(false);
    expect(shouldMigrateStateFromPath(["models", "status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
