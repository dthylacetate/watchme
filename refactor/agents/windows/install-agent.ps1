param(
  [string]$BundleDir = ".",
  [string]$ExecutableName = "WatchMeAgent.exe",
  [switch]$SkipStartup,
  [switch]$SkipLaunch
)

$ErrorActionPreference = "Stop"
$bundleRoot = if ($BundleDir -eq ".") { $PSScriptRoot } else { $BundleDir }
$resolvedBundle = Resolve-Path $bundleRoot
$baseDir = $resolvedBundle.Path
$exePath = Join-Path $baseDir $ExecutableName
$configExamplePath = Join-Path $baseDir "config.example.json"
$configPath = Join-Path $baseDir "config.json"
$startupScript = Join-Path $baseDir "install-startup.ps1"

if (-not (Test-Path $exePath)) {
  throw "Could not find $ExecutableName in $baseDir."
}

if ((-not $SkipStartup) -and (-not (Test-Path $startupScript))) {
  throw "Could not find install-startup.ps1 in $baseDir."
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

if (-not $SkipStartup) {
  & $startupScript -ExecutablePath $exePath
}

if (-not $SkipLaunch) {
  Start-Process -FilePath $exePath -WorkingDirectory $baseDir -WindowStyle Hidden
  Write-Host "Started $ExecutableName."
}

if ($needsConfigEdit) {
  Write-Host "config.json still contains placeholder values. Opening it now."
  Invoke-Item $configPath
}
else {
  Write-Host "config.json already looks customized."
}

Write-Host "Agent install completed."
