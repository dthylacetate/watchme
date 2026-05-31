param(
  [string]$BundleDir = ".",
  [string]$ExecutableName = "WatchMeAgent.exe",
  [switch]$EnableStartup,
  [switch]$SkipLaunch
)

$ErrorActionPreference = "Stop"
$bundleRoot = if ($BundleDir -eq ".") { $PSScriptRoot } else { $BundleDir }
$resolvedBundle = Resolve-Path $bundleRoot
$baseDir = $resolvedBundle.Path
$exePath = Join-Path $baseDir $ExecutableName
$workerPath = Join-Path $baseDir "WatchMeAgentWorker.exe"
$configExamplePath = Join-Path $baseDir "config.example.json"
$configPath = Join-Path $baseDir "config.json"
$startupScript = Join-Path $baseDir "install-startup.ps1"

if (-not (Test-Path $exePath)) {
  throw "Could not find $ExecutableName in $baseDir."
}

if ($EnableStartup -and (-not (Test-Path $startupScript))) {
  throw "Could not find install-startup.ps1 in $baseDir."
}

if ($EnableStartup -and (-not (Test-Path $workerPath))) {
  throw "Could not find WatchMeAgentWorker.exe in $baseDir."
}

if (-not (Test-Path $configPath)) {
  if (-not (Test-Path $configExamplePath)) {
    throw "Could not find config.example.json in $baseDir."
  }

  Copy-Item -LiteralPath $configExamplePath -Destination $configPath
  Write-Host "Created config.json from config.example.json."
}

$configContent = Get-Content -Raw -LiteralPath $configPath
$needsConfigEdit = $configContent -match "replace-with-device-token"

if ($EnableStartup) {
  & $startupScript -ExecutablePath $workerPath
}

if (-not $SkipLaunch) {
  Start-Process -FilePath $exePath -WorkingDirectory $baseDir
  Write-Host "Started $ExecutableName."
}

if ($needsConfigEdit) {
  Write-Host "config.json still contains placeholder values. Opening it now."
  Invoke-Item $configPath
}
else {
  Write-Host "config.json already looks customized."
}

Write-Host "Agent manager is ready."
