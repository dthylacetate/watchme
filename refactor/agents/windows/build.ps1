param(
  [string]$Python = "py -3.12",
  [string]$OutputDir = "dist"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $root ".build-venv"
$managerExeName = "WatchMeAgent"
$workerExeName = "WatchMeAgentWorker"
$releaseDir = Join-Path $root $OutputDir
$bundleDir = Join-Path $releaseDir $managerExeName

function Stop-AgentBuildProcesses {
  foreach ($name in @($managerExeName, $workerExeName)) {
    $processes = Get-Process -Name $name -ErrorAction SilentlyContinue
    foreach ($process in $processes) {
      try {
        if ($process.Path -and $process.Path.StartsWith($bundleDir, [System.StringComparison]::OrdinalIgnoreCase)) {
          Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
      }
      catch {
        # Ignore processes whose executable path cannot be queried by this shell.
      }
    }
  }
}

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
  Stop-AgentBuildProcesses
  if (Test-Path $releaseDir) { Remove-Item -Recurse -Force $releaseDir }

  & $venvPython -m PyInstaller `
    --name $workerExeName `
    --onefile `
    --noconsole `
    --collect-all winsdk `
    --collect-all pystray `
    --collect-all PIL `
    agent.py | Out-Host

  & $venvPython -m PyInstaller `
    --name $managerExeName `
    --onefile `
    --noconsole `
    --collect-all winsdk `
    --collect-all pystray `
    --collect-all PIL `
    manager.py | Out-Host

  New-Item -ItemType Directory -Force $bundleDir | Out-Null
  Copy-Item ".\dist\$managerExeName.exe" $bundleDir
  Copy-Item ".\dist\$workerExeName.exe" $bundleDir
  Copy-Item ".\config.example.json" (Join-Path $bundleDir "config.example.json")
  Copy-Item ".\install-agent.ps1" (Join-Path $bundleDir "install-agent.ps1")
  Copy-Item ".\install-startup.ps1" (Join-Path $bundleDir "install-startup.ps1")
  Copy-Item ".\uninstall-startup.ps1" (Join-Path $bundleDir "uninstall-startup.ps1")
  Copy-Item ".\uninstall-agent.ps1" (Join-Path $bundleDir "uninstall-agent.ps1")
  New-Item -ItemType Directory -Force (Join-Path $bundleDir "logs") | Out-Null

  $readme = @"
WatchMe Agent release

1. Run WatchMeAgent.exe
2. Fill in server_url and token in the manager window
3. Use Start Agent to launch the tray worker
4. Use Enable Startup if you want it to run at logon

Logs are written to .\logs\agent.log
"@
  Set-Content -Path (Join-Path $bundleDir "README.txt") -Value $readme -Encoding UTF8
  Compress-Archive -Path (Join-Path $bundleDir "*") -DestinationPath (Join-Path $releaseDir "$managerExeName.zip") -Force

  $managerSpec = Join-Path $root "$managerExeName.spec"
  $workerSpec = Join-Path $root "$workerExeName.spec"
  if (Test-Path $managerSpec) { Remove-Item -LiteralPath $managerSpec -Force }
  if (Test-Path $workerSpec) { Remove-Item -LiteralPath $workerSpec -Force }

  Write-Host "Built agent bundle at $bundleDir"
  Write-Host "Zip package at $(Join-Path $releaseDir "$managerExeName.zip")"
}
finally {
  Pop-Location
}
