#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "${ROOT}/config.json" && -f "${ROOT}/config.example.json" ]]; then
  cp "${ROOT}/config.example.json" "${ROOT}/config.json"
fi

echo "WatchMe macOS Agent is ready."
echo "Edit ${ROOT}/config.json, then run manager.py or agent.py."

if [[ -d "${ROOT}/WatchMeAgent.app" ]]; then
  open "${ROOT}/WatchMeAgent.app"
elif [[ -x "${ROOT}/WatchMeAgent.command" ]]; then
  open "${ROOT}/WatchMeAgent.command"
elif [[ -f "${ROOT}/manager.py" ]] && command -v python3 >/dev/null 2>&1; then
  python3 "${ROOT}/manager.py" >/dev/null 2>&1 &
fi
