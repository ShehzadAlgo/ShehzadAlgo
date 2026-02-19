#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${SHEHZADALGO_IMAGE:-${shehzadalgo_IMAGE:-shehzadalgo:local}}"
CONFIG_DIR="${SHEHZADALGO_CONFIG_DIR:-${shehzadalgo_CONFIG_DIR:-$HOME/.shehzadalgo}}"
WORKSPACE_DIR="${SHEHZADALGO_WORKSPACE_DIR:-${shehzadalgo_WORKSPACE_DIR:-$HOME/.shehzadalgo/workspace}}"
PROFILE_FILE="${SHEHZADALGO_PROFILE_FILE:-${shehzadalgo_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e SHEHZADALGO_LIVE_TEST=1 \
  -e SHEHZADALGO_LIVE_MODELS="${SHEHZADALGO_LIVE_MODELS:-${shehzadalgo_LIVE_MODELS:-all}}" \
  -e SHEHZADALGO_LIVE_PROVIDERS="${SHEHZADALGO_LIVE_PROVIDERS:-${shehzadalgo_LIVE_PROVIDERS:-}}" \
  -e SHEHZADALGO_LIVE_MODEL_TIMEOUT_MS="${SHEHZADALGO_LIVE_MODEL_TIMEOUT_MS:-${shehzadalgo_LIVE_MODEL_TIMEOUT_MS:-}}" \
  -e SHEHZADALGO_LIVE_REQUIRE_PROFILE_KEYS="${SHEHZADALGO_LIVE_REQUIRE_PROFILE_KEYS:-${shehzadalgo_LIVE_REQUIRE_PROFILE_KEYS:-}}" \
  -v "$CONFIG_DIR":/home/node/.shehzadalgo \
  -v "$WORKSPACE_DIR":/home/node/.shehzadalgo/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "set -euo pipefail; [ -f \"$HOME/.profile\" ] && source \"$HOME/.profile\" || true; cd /app && pnpm test:live"
