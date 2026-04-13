$ErrorActionPreference = 'SilentlyContinue'

Set-Location (Join-Path $PSScriptRoot '..')

$killedPids = @()

# Kill any running Next.js process for this frontend workspace.
$frontendNextProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -like '*D:\DevOPS\Synora\frontend\node_modules\next*'
  } |
  Select-Object -ExpandProperty ProcessId -Unique

foreach ($procId in $frontendNextProcesses) {
  if ($procId -and $procId -ne $PID) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    $killedPids += $procId
  }
}

if ($killedPids.Count -gt 0 -and (Test-Path '.next')) {
  Remove-Item -Recurse -Force '.next'
}

$ErrorActionPreference = 'Continue'
npm run dev:raw
