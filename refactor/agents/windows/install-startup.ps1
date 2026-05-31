param(
  [string]$ExecutablePath = ".\dist\WatchMeAgent\WatchMeAgentWorker.exe",
  [string]$Arguments = ""
)

$ErrorActionPreference = "Stop"
$target = Resolve-Path $ExecutablePath
if ([string]::IsNullOrWhiteSpace($Arguments)) {
  $action = New-ScheduledTaskAction -Execute $target.Path
}
else {
  $action = New-ScheduledTaskAction -Execute $target.Path -Argument $Arguments
}
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "WatchMeAgent" -Action $action -Trigger $trigger -Settings $settings -Description "Start WatchMe Windows agent at logon" -Force | Out-Null
Write-Host "Scheduled task WatchMeAgent registered for $($target.Path) $Arguments"
