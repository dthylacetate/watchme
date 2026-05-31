param(
  [string]$TargetDir = $PSScriptRoot
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) {
  [System.Windows.Forms.MessageBox]::Show("Node.js was not found in PATH.", "WatchMe Server Manager")
  exit 1
}

$resolvedTarget = Resolve-Path $TargetDir
$managerCli = Join-Path $PSScriptRoot "manage-server.mjs"

function Invoke-ManagerJson {
  param(
    [string[]]$Arguments
  )

  $output = & node $managerCli @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw (($output | Out-String).Trim())
  }

  return (($output | Out-String) | ConvertFrom-Json)
}

function Show-ErrorMessage {
  param([string]$Message)
  [System.Windows.Forms.MessageBox]::Show($Message, "WatchMe Server Manager", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error) | Out-Null
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "WatchMe Server Manager"
$form.Size = New-Object System.Drawing.Size(760, 620)
$form.StartPosition = "CenterScreen"

$font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Font = $font

$labels = @{}
$textBoxes = @{}

function Add-Label($text, $x, $y, $w = 120, $h = 22) {
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $text
  $label.Location = New-Object System.Drawing.Point($x, $y)
  $label.Size = New-Object System.Drawing.Size($w, $h)
  $form.Controls.Add($label)
  return $label
}

function Add-TextBox($name, $x, $y, $w = 520, $h = 24) {
  $textbox = New-Object System.Windows.Forms.TextBox
  $textbox.Location = New-Object System.Drawing.Point($x, $y)
  $textbox.Size = New-Object System.Drawing.Size($w, $h)
  $form.Controls.Add($textbox)
  $textBoxes[$name] = $textbox
  return $textbox
}

function Add-Button($text, $x, $y, $w, $h, $handler) {
  $button = New-Object System.Windows.Forms.Button
  $button.Text = $text
  $button.Location = New-Object System.Drawing.Point($x, $y)
  $button.Size = New-Object System.Drawing.Size($w, $h)
  $button.Add_Click($handler)
  $form.Controls.Add($button)
  return $button
}

$title = Add-Label "WatchMe Server Manager" 20 16 300 28
$title.Font = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
$subtitle = Add-Label "在 Windows 上用图形界面管理 release 配置、启动和健康检查。" 20 48 520 20
$subtitle.ForeColor = [System.Drawing.Color]::DimGray

Add-Label "Release Dir" 20 88 100 24
$releaseDir = Add-TextBox "releaseDir" 150 86 560
$releaseDir.ReadOnly = $true
$releaseDir.Text = $resolvedTarget.Path

Add-Label "PORT" 20 126
Add-TextBox "port" 150 124 180
Add-Label "HASH_SECRET" 20 160
Add-TextBox "hashSecret" 150 158 560
Add-Label "DISPLAY_NAME" 20 194
Add-TextBox "displayName" 150 192 220
Add-Label "SITE_TITLE" 20 228
Add-TextBox "siteTitle" 150 226 280
Add-Label "SITE_DESC" 20 262
Add-TextBox "siteDescription" 150 260 560
Add-Label "Agent Token" 20 296
Add-TextBox "agentToken" 150 294 220
Add-Label "Device ID" 20 330
Add-TextBox "deviceId" 150 328 220
Add-Label "Device Name" 20 364
Add-TextBox "deviceName" 150 362 280

$statusLabel = Add-Label "Status: Ready" 20 404 690 22
$baseUrlLabel = Add-Label "Base URL: -" 20 430 690 22
$deviceTokenLabel = Add-Label "DEVICE_TOKEN_1: -" 20 454 690 36

function Update-Hints {
  $port = $textBoxes["port"].Text
  if ([string]::IsNullOrWhiteSpace($port)) { $port = "3000" }
  $baseUrlLabel.Text = "Base URL: http://127.0.0.1:$port"

  $token = $textBoxes["agentToken"].Text
  if ([string]::IsNullOrWhiteSpace($token)) { $token = "your-agent-token" }
  $deviceId = $textBoxes["deviceId"].Text
  if ([string]::IsNullOrWhiteSpace($deviceId)) { $deviceId = "my-desktop" }
  $deviceName = $textBoxes["deviceName"].Text
  if ([string]::IsNullOrWhiteSpace($deviceName)) { $deviceName = "My Desktop" }

  $deviceTokenLabel.Text = "DEVICE_TOKEN_1: $token:$deviceId:$deviceName`:windows"
}

foreach ($key in @("port", "agentToken", "deviceId", "deviceName")) {
  $textBoxes[$key].Add_TextChanged({ Update-Hints })
}

function Read-Snapshot {
  $snapshot = Invoke-ManagerJson @("inspect", "--target", $resolvedTarget.Path)
  $config = $snapshot.config
  $textBoxes["port"].Text = [string]$config.port
  $textBoxes["hashSecret"].Text = [string]$config.hashSecret
  $textBoxes["displayName"].Text = [string]$config.displayName
  $textBoxes["siteTitle"].Text = [string]$config.siteTitle
  $textBoxes["siteDescription"].Text = [string]$config.siteDescription
  $textBoxes["agentToken"].Text = [string]$config.agentToken
  $textBoxes["deviceId"].Text = [string]$config.deviceId
  $textBoxes["deviceName"].Text = [string]$config.deviceName
  $statusLabel.Text = if ($snapshot.running) { "Status: Running (PID $($snapshot.pid))" } else { "Status: Stopped" }
  $baseUrlLabel.Text = "Base URL: $($snapshot.baseUrl)"
  Update-Hints
}

function Save-Config {
  $payload = @{
    port = $textBoxes["port"].Text
    hashSecret = $textBoxes["hashSecret"].Text
    displayName = $textBoxes["displayName"].Text
    siteTitle = $textBoxes["siteTitle"].Text
    siteDescription = $textBoxes["siteDescription"].Text
    agentToken = $textBoxes["agentToken"].Text
    deviceId = $textBoxes["deviceId"].Text
    deviceName = $textBoxes["deviceName"].Text
    platform = "windows"
  } | ConvertTo-Json -Compress

  Invoke-ManagerJson @("save", "--target", $resolvedTarget.Path, "--json", $payload) | Out-Null
  $statusLabel.Text = "Status: Saved .env"
  Read-Snapshot
}

Add-Button "Refresh" 20 502 90 32 {
  try {
    Read-Snapshot
  } catch {
    Show-ErrorMessage $_.Exception.Message
  }
} | Out-Null

Add-Button "Save Config" 120 502 110 32 {
  try {
    Save-Config
  } catch {
    Show-ErrorMessage $_.Exception.Message
  }
} | Out-Null

Add-Button "Start Server" 240 502 110 32 {
  try {
    Save-Config
    $result = Invoke-ManagerJson @("start", "--target", $resolvedTarget.Path)
    $statusLabel.Text = "Status: Running (PID $($result.pid))"
    Read-Snapshot
  } catch {
    Show-ErrorMessage $_.Exception.Message
  }
} | Out-Null

Add-Button "Stop Server" 360 502 110 32 {
  try {
    Invoke-ManagerJson @("stop", "--target", $resolvedTarget.Path) | Out-Null
    $statusLabel.Text = "Status: Stopped"
    Read-Snapshot
  } catch {
    Show-ErrorMessage $_.Exception.Message
  }
} | Out-Null

Add-Button "Health Check" 480 502 110 32 {
  try {
    $result = Invoke-ManagerJson @("health", "--target", $resolvedTarget.Path)
    [System.Windows.Forms.MessageBox]::Show("Health check passed.`n`n$($result.baseUrl)", "WatchMe Server Manager") | Out-Null
    $statusLabel.Text = "Status: Health check passed"
  } catch {
    Show-ErrorMessage $_.Exception.Message
  }
} | Out-Null

Add-Button "Open Logs" 600 502 90 32 {
  Start-Process explorer.exe (Join-Path $resolvedTarget.Path "logs")
} | Out-Null

Add-Button "Open Folder" 20 542 110 32 {
  Start-Process explorer.exe $resolvedTarget.Path
} | Out-Null

Add-Button "Backup DB" 140 542 110 32 {
  try {
    $result = Invoke-ManagerJson @("backup", "--target", $resolvedTarget.Path)
    [System.Windows.Forms.MessageBox]::Show("Backup created:`n$($result.backupPath)", "WatchMe Server Manager") | Out-Null
    $statusLabel.Text = "Status: Backup created"
  } catch {
    Show-ErrorMessage $_.Exception.Message
  }
} | Out-Null

Read-Snapshot
[void]$form.ShowDialog()
