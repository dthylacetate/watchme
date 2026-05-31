#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE_URL="${1:-http://127.0.0.1:3000}"
RETRIES="${2:-20}"
DELAY_MS="${3:-1000}"

cd "$ROOT"
node ./refactor/scripts/check-release-health.mjs "$BASE_URL" "$RETRIES" "$DELAY_MS"
