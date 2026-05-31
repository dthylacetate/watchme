param(
  [string]$Python = "py -3.12",
  [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $root ".build-venv"
$exeName = "WatchMeAgent"
$releaseDir = Join-Path $root $OutputDir
$bundleDir = Join-Path $releaseDir $exeName

if (Test-Path $venv) {
  Remove-Item -Recurse -Force $venv
}

Push-Location $root
try {
  Invoke-Expression "$Python -m venv `"$venv`""
  $venvPython = Join-Path $venv "Scripts\python.exe"
  & $venvPython -m pip install --upgrade pip | Out-Host
  & $venvPython -m pip install -r requirements.txt pyinstaller | Out-Host

  if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
  if (Test-Path $releaseDir) { Remove-Item -Recurse -Force $releaseDir }

  & $venvPython -m PyInstaller `
    --name $exeName `
    --onefile `
    --noconsole `
    --collect-all winsdk `
    --collect-all pystray `
    --collect-all PIL `
    agent.py | Out-Host

  New-Item -ItemType Directory -Force $bundleDir | Out-Null
  Copy-Item ".\dist\$exeName.exe" $bundleDir
  Copy-Item ".\config.example.json" (Join-Path $bundleDir "config.example.json")
  Copy-Item ".\install-agent.ps1" (Join-Path $bundleDir "install-agent.ps1")
  Copy-Item ".\install-startup.ps1" (Join-Path $bundleDir "install-startup.ps1")
  Copy-Item ".\uninstall-startup.ps1" (Join-Path $bundleDir "uninstall-startup.ps1")
  Copy-Item ".\uninstall-agent.ps1" (Join-Path $bundleDir "uninstall-agent.ps1")
  New-Item -ItemType Directory -Force (Join-Path $bundleDir "logs") | Out-Null

  $readme = @"
WatchMe Agent release

1. Run install-agent.ps1
2. Fill in server_url and token if config.json still has placeholder values
3. The agent will stay in the system tray
4. install-startup.ps1 and uninstall-agent.ps1 are included

Logs are written to .\logs\agent.log
"@
  Set-Content -Path (Join-Path $bundleDir "README.txt") -Value $readme -Encoding UTF8
  Compress-Archive -Path (Join-Path $bundleDir "*") -DestinationPath (Join-Path $releaseDir "$exeName.zip") -Force

  Write-Host "Built agent bundle at $bundleDir"
  Write-Host "Zip package at $(Join-Path $releaseDir "$exeName.zip")"
}
finally {
  Pop-Location
}
