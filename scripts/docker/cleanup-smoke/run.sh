#!/usr/bin/env bash
set -euo pipefail

cd /repo

export SHEHZADALGO_STATE_DIR="/tmp/shehzadalgo-test"
export SHEHZADALGO_CONFIG_PATH="${SHEHZADALGO_STATE_DIR}/shehzadalgo.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${SHEHZADALGO_STATE_DIR}/credentials"
mkdir -p "${SHEHZADALGO_STATE_DIR}/agents/main/sessions"
echo '{}' >"${SHEHZADALGO_CONFIG_PATH}"
echo 'creds' >"${SHEHZADALGO_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${SHEHZADALGO_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm shehzadalgo reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${SHEHZADALGO_CONFIG_PATH}"
test ! -d "${SHEHZADALGO_STATE_DIR}/credentials"
test ! -d "${SHEHZADALGO_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${SHEHZADALGO_STATE_DIR}/credentials"
echo '{}' >"${SHEHZADALGO_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm shehzadalgo uninstall --state --yes --non-interactive

test ! -d "${SHEHZADALGO_STATE_DIR}"

echo "OK"
