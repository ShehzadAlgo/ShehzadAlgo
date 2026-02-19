import { captureEnv } from "../test-utils/env.js";

export function snapshotStateDirEnv() {
  return captureEnv(["shehzadalgo_STATE_DIR", "shehzadalgo_STATE_DIR"]);
}

export function restoreStateDirEnv(snapshot: ReturnType<typeof snapshotStateDirEnv>): void {
  snapshot.restore();
}

export function setStateDirEnv(stateDir: string): void {
  process.env.shehzadalgo_STATE_DIR = stateDir;
  delete process.env.shehzadalgo_STATE_DIR;
}
