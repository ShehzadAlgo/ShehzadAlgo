import { captureEnv } from "../test-utils/env.js";

export function snapshotStateDirEnv() {
  return captureEnv(["SHEHZADALGO_STATE_DIR", "SHEHZADALGO_STATE_DIR"]);
}

export function restoreStateDirEnv(snapshot: ReturnType<typeof snapshotStateDirEnv>): void {
  snapshot.restore();
}

export function setStateDirEnv(stateDir: string): void {
  process.env.SHEHZADALGO_STATE_DIR = stateDir;
  delete process.env.SHEHZADALGO_STATE_DIR;
}
