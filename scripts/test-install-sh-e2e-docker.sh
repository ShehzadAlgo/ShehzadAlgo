#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${SHEHZADALGO_INSTALL_E2E_IMAGE:-${shehzadalgo_INSTALL_E2E_IMAGE:-shehzadalgo-install-e2e:local}}"
INSTALL_URL="${SHEHZADALGO_INSTALL_URL:-${shehzadalgo_INSTALL_URL:-https://shehzadalgo.ai/install.sh}}"

OPENAI_API_KEY="${OPENAI_API_KEY:-}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
ANTHROPIC_API_TOKEN="${ANTHROPIC_API_TOKEN:-}"
SHEHZADALGO_E2E_MODELS="${SHEHZADALGO_E2E_MODELS:-${shehzadalgo_E2E_MODELS:-}}"

echo "==> Build image: $IMAGE_NAME"
docker build \
  -t "$IMAGE_NAME" \
  -f "$ROOT_DIR/scripts/docker/install-sh-e2e/Dockerfile" \
  "$ROOT_DIR/scripts/docker/install-sh-e2e"

echo "==> Run E2E installer test"
docker run --rm \
  -e SHEHZADALGO_INSTALL_URL="$INSTALL_URL" \
  -e SHEHZADALGO_INSTALL_TAG="${SHEHZADALGO_INSTALL_TAG:-${shehzadalgo_INSTALL_TAG:-latest}}" \
  -e SHEHZADALGO_E2E_MODELS="$SHEHZADALGO_E2E_MODELS" \
  -e SHEHZADALGO_INSTALL_E2E_PREVIOUS="${SHEHZADALGO_INSTALL_E2E_PREVIOUS:-${shehzadalgo_INSTALL_E2E_PREVIOUS:-}}" \
  -e SHEHZADALGO_INSTALL_E2E_SKIP_PREVIOUS="${SHEHZADALGO_INSTALL_E2E_SKIP_PREVIOUS:-${shehzadalgo_INSTALL_E2E_SKIP_PREVIOUS:-0}}" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e ANTHROPIC_API_TOKEN="$ANTHROPIC_API_TOKEN" \
  "$IMAGE_NAME"
