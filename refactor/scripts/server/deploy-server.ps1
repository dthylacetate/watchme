param(
  [string]$TargetDir = ".\refactor\.release\server"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$resolvedTarget = Resolve-Path -Path $TargetDir -ErrorAction SilentlyContinue
if (-not $resolvedTarget) {
  $resolvedTarget = [System.IO.Path]::GetFullPath((Join-Path $root $TargetDir))
}
else {
  $resolvedTarget = $resolvedTarget.Path
}

Push-Location $root
try {
  npm install
  npm run package:server -- $resolvedTarget
}
finally {
  Pop-Location
}

Push-Location $resolvedTarget
try {
  npm install --omit=dev
  New-Item -ItemType Directory -Force data, logs | Out-Null
  if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
  }
}
finally {
  Pop-Location
}

Push-Location $root
try {
  node .\refactor\scripts\server\run-release-healthcheck.mjs $resolvedTarget
}
finally {
  Pop-Location
}

Write-Host "WatchMe server release prepared at $resolvedTarget"
Write-Host "Next steps:"
Write-Host "  1. Edit $resolvedTarget\.env"
Write-Host "     - Set HASH_SECRET to a long random string"
Write-Host "     - Set DEVICE_TOKEN_1=your-agent-token:your-device-id:Your Device Name:windows"
Write-Host "  2. On Windows you can run: $resolvedTarget\manage-server-ui.cmd"
Write-Host "  3. Or run manually: npm --prefix $resolvedTarget run start"
