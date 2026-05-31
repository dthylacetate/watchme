param(
  [string]$TaskName = "WatchMeAgent",
  [switch]$PurgeLogs,
  [switch]$PurgeConfig
)

$ErrorActionPreference = "Stop"
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($null -ne $task) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed scheduled task $TaskName."
}
else {
  Write-Host "Scheduled task $TaskName was not found."
}

$processNames = @("WatchMeAgentWorker", "WatchMeAgent")
$stoppedAny = $false
foreach ($name in $processNames) {
  $processes = Get-Process -Name $name -ErrorAction SilentlyContinue
  if ($null -ne $processes) {
    $processes | Stop-Process -Force
    Write-Host "Stopped running $name process."
    $stoppedAny = $true
  }
}

if (-not $stoppedAny) {
  Write-Host "No running WatchMe agent processes found."
}

if ($PurgeLogs) {
  $logDir = Join-Path $baseDir "logs"
  if (Test-Path $logDir) {
    Remove-Item -LiteralPath $logDir -Recurse -Force
    Write-Host "Removed log directory $logDir."
  }
}

if ($PurgeConfig) {
  $configPath = Join-Path $baseDir "config.json"
  if (Test-Path $configPath) {
    Remove-Item -LiteralPath $configPath -Force
    Write-Host "Removed config file $configPath."
  }
}

Write-Host "Agent uninstall cleanup completed."
