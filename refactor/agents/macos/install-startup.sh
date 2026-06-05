#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LABEL="${WATCHME_LAUNCHD_LABEL:-com.watchme.agent}"
PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST_PATH="${PLIST_DIR}/${LABEL}.plist"
LOG_DIR="${ROOT}/logs"

mkdir -p "${PLIST_DIR}" "${LOG_DIR}"

if [[ -x "${ROOT}/WatchMeAgentWorker" ]]; then
  PROGRAM_ARGS="<string>${ROOT}/WatchMeAgentWorker</string>"
elif [[ -x "${ROOT}/WatchMeAgentWorker.app/Contents/MacOS/WatchMeAgentWorker" ]]; then
  PROGRAM_ARGS="<string>${ROOT}/WatchMeAgentWorker.app/Contents/MacOS/WatchMeAgentWorker</string>"
else
  PYTHON_BIN="${WATCHME_PYTHON:-$(command -v python3)}"
  PROGRAM_ARGS="<string>${PYTHON_BIN}</string>
    <string>${ROOT}/agent.py</string>"
fi

cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    ${PROGRAM_ARGS}
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/launchd.err.log</string>
</dict>
</plist>
EOF

if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
  launchctl bootout "gui/$(id -u)" "${PLIST_PATH}" >/dev/null 2>&1 || true
fi

launchctl bootstrap "gui/$(id -u)" "${PLIST_PATH}"
launchctl enable "gui/$(id -u)/${LABEL}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}" || true

echo "Installed ${LABEL} at ${PLIST_PATH}"
