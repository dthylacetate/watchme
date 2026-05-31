param(
  [string]$ExecutablePath = "",
  [string]$Arguments = "",
  [string]$TaskName = "WatchMeAgent"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($ExecutablePath)) {
  $ExecutablePath = Join-Path $scriptDir "WatchMeAgentWorker.exe"
}

$target = Resolve-Path -LiteralPath $ExecutablePath
$workingDirectory = Split-Path -Parent $target.Path
$startupDir = [Environment]::GetFolderPath("Startup")
if ([string]::IsNullOrWhiteSpace($startupDir)) {
  throw "Could not resolve the current user's Startup folder."
}

$shortcutPath = Join-Path $startupDir "$TaskName.lnk"
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target.Path
$shortcut.Arguments = $Arguments
$shortcut.WorkingDirectory = $workingDirectory
$shortcut.WindowStyle = 7
$shortcut.Description = "Start WatchMe Windows agent at logon"
$shortcut.Save()

# Clean up older task-scheduler based installs when possible. This is best-effort
# because removing scheduled tasks can require elevated permissions on some PCs.
try {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($null -ne $task) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  }
}
catch {
}

Write-Host "Startup shortcut $shortcutPath registered for $($target.Path) $Arguments"
