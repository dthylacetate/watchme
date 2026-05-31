param(
  [string]$ExecutablePath = ".\dist\WatchMeAgent\WatchMeAgent.exe"
)

$ErrorActionPreference = "Stop"
$target = Resolve-Path $ExecutablePath
$action = New-ScheduledTaskAction -Execute $target.Path
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName "WatchMeAgent" -Action $action -Trigger $trigger -Settings $settings -Description "Start WatchMe Windows agent at logon" -Force | Out-Null
Write-Host "Scheduled task WatchMeAgent registered for $($target.Path)"
