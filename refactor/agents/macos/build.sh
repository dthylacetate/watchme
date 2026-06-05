#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PYTHON:-python3}"
VENV="${ROOT}/.build-venv"
OUTPUT_DIR="${1:-dist}"
RELEASE_DIR="${ROOT}/${OUTPUT_DIR}"
BUNDLE_DIR="${RELEASE_DIR}/WatchMeAgent"
PYINSTALLER_DIST="${ROOT}/pyinstaller-dist"

rm -rf "${VENV}"
"${PYTHON_BIN}" -m venv "${VENV}"
"${VENV}/bin/python" -m pip install --upgrade pip
"${VENV}/bin/python" -m pip install -r "${ROOT}/requirements.txt" pyinstaller

rm -rf "${ROOT}/build" "${PYINSTALLER_DIST}" "${RELEASE_DIR}"

pushd "${ROOT}" >/dev/null
"${VENV}/bin/python" -m PyInstaller \
  --name WatchMeAgentWorker \
  --windowed \
  --distpath "${PYINSTALLER_DIST}" \
  --collect-all pystray \
  --collect-all PIL \
  agent.py

MANAGER_APP_BUILT=0
if "${VENV}/bin/python" -c "import tkinter" >/dev/null 2>&1; then
  "${VENV}/bin/python" -m PyInstaller \
    --name WatchMeAgent \
    --windowed \
    --distpath "${PYINSTALLER_DIST}" \
    --collect-all pystray \
    --collect-all PIL \
    manager.py
  MANAGER_APP_BUILT=1
else
  echo "Skipping WatchMeAgent.app: tkinter is unavailable inside the build venv."
  echo "The release will include WatchMeAgent.command, which runs manager.py with system python3."
fi
popd >/dev/null

mkdir -p "${BUNDLE_DIR}/logs"
cp -R "${PYINSTALLER_DIST}/WatchMeAgentWorker.app" "${BUNDLE_DIR}/"
cp "${ROOT}/config.example.json" "${BUNDLE_DIR}/config.example.json"
cp "${ROOT}/agent.py" "${BUNDLE_DIR}/agent.py"
cp "${ROOT}/manager.py" "${BUNDLE_DIR}/manager.py"
cp "${ROOT}/requirements.txt" "${BUNDLE_DIR}/requirements.txt"
cp "${ROOT}/install-agent.sh" "${BUNDLE_DIR}/install-agent.sh"
cp "${ROOT}/install-startup.sh" "${BUNDLE_DIR}/install-startup.sh"
cp "${ROOT}/uninstall-startup.sh" "${BUNDLE_DIR}/uninstall-startup.sh"
if [[ "${MANAGER_APP_BUILT}" == "1" ]]; then
  cp -R "${PYINSTALLER_DIST}/WatchMeAgent.app" "${BUNDLE_DIR}/"
fi

cat > "${BUNDLE_DIR}/WatchMeAgent.command" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ ! -f "${ROOT}/config.json" && -f "${ROOT}/config.example.json" ]]; then
  cp "${ROOT}/config.example.json" "${ROOT}/config.json"
fi
cd "${ROOT}"
python3 manager.py
EOF

chmod +x "${BUNDLE_DIR}/install-agent.sh" "${BUNDLE_DIR}/install-startup.sh" "${BUNDLE_DIR}/uninstall-startup.sh" "${BUNDLE_DIR}/WatchMeAgent.command"

cat > "${BUNDLE_DIR}/README.txt" <<'EOF'
WatchMe macOS Agent release

1. Run WatchMeAgent.app if present; otherwise run WatchMeAgent.command
2. Fill in server_url and token in the manager window
3. Use Test Connection
4. Use Start Agent to launch the worker
5. Use Enable Startup if you want launchd to run it at login

Logs are written to ./logs/agent.log and ./logs/launchd.*.log.
EOF

rm -f "${ROOT}/WatchMeAgent.spec" "${ROOT}/WatchMeAgentWorker.spec"

pushd "${RELEASE_DIR}" >/dev/null
/usr/bin/zip -qry WatchMeAgent.zip WatchMeAgent
popd >/dev/null

echo "Built macOS agent bundle at ${BUNDLE_DIR}"
echo "Zip package at ${RELEASE_DIR}/WatchMeAgent.zip"
