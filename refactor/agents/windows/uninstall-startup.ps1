param(
  [string]$TaskName = "WatchMeAgent"
)

$ErrorActionPreference = "Stop"
$startupDir = [Environment]::GetFolderPath("Startup")
$removedAny = $false

if (-not [string]::IsNullOrWhiteSpace($startupDir)) {
  $shortcutPath = Join-Path $startupDir "$TaskName.lnk"
  if (Test-Path -LiteralPath $shortcutPath) {
    Remove-Item -LiteralPath $shortcutPath -Force
    Write-Host "Startup shortcut $shortcutPath removed."
    $removedAny = $true
  }
}

# Compatibility cleanup for releases that registered a scheduled task.
try {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($null -ne $task) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Scheduled task $TaskName removed."
    $removedAny = $true
  }
}
catch {
  Write-Host "Scheduled task cleanup skipped: $($_.Exception.Message)"
}

if (-not $removedAny) {
  Write-Host "Startup entry $TaskName was not found."
}
