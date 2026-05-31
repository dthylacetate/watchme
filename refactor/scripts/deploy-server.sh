#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_DIR="${1:-"$ROOT/refactor/.release/server"}"

cd "$ROOT"
npm install
npm run package:server -- "$TARGET_DIR"

cd "$TARGET_DIR"
npm install --omit=dev
mkdir -p data logs
if [[ ! -f .env ]]; then
  cp .env.example .env
fi

cd "$ROOT"
node ./refactor/scripts/run-release-healthcheck.mjs "$TARGET_DIR"

echo "WatchMe server release prepared at $TARGET_DIR"
echo "Next steps:"
echo "  1. Edit $TARGET_DIR/.env"
echo "     - Set HASH_SECRET to a long random string"
echo "     - Set DEVICE_TOKEN_1=your-agent-token:your-device-id:Your Device Name:windows"
echo "  2. Run interactive manager: node $TARGET_DIR/manage-server.mjs"
echo "  3. Or run manually: npm --prefix $TARGET_DIR run start"
