param(
  [string]$Source = ".\refactor\.release\server\data\watchme.db",
  [string]$TargetDir = ".\refactor\.release\server\backups"
)

$ErrorActionPreference = "Stop"
$sourcePath = Resolve-Path $Source
$backupDir = [System.IO.Path]::GetFullPath($TargetDir)
New-Item -ItemType Directory -Force $backupDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetPath = Join-Path $backupDir "watchme-$timestamp.db"
Copy-Item $sourcePath $targetPath -Force
Write-Host "Backup created at $targetPath"
