param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [int]$Retries = 20,
  [int]$DelayMs = 1000
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Push-Location $root
try {
  node .\refactor\scripts\check-release-health.mjs $BaseUrl $Retries $DelayMs
}
finally {
  Pop-Location
}
