# Runs the complete local desk. Ctrl+C stops only processes started here.
param([switch]$SkipBuild, [switch]$SkipRefresh)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$python = Join-Path $PSScriptRoot 'backend/.venv/Scripts/python.exe'
if (-not (Test-Path $python)) { throw 'Install backend dependencies first; see README.md.' }
foreach ($port in @(8000, 3000)) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use. Stop the existing GlobalDesk instance before running this launcher."
    }
}
$children = @()
$logDirectory = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
function Start-DeskService($Name, $Executable, $Arguments, $Directory) {
    Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logDirectory "$stamp-$Name.log") `
        -RedirectStandardError (Join-Path $logDirectory "$stamp-$Name-error.log")
}
try {
    Push-Location backend
    try {
        & $python -m app.backup backup --destination "../backups/pre-launch-$stamp.db"
        if ($LASTEXITCODE -ne 0) { throw 'Database backup failed.' }
        & $python -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
        & $python -m app.seed
        if ($LASTEXITCODE -ne 0) { throw 'Database seed failed.' }
    } finally { Pop-Location }
    $env:INTERNAL_API_URL = 'http://127.0.0.1:8000'
    $env:OWNER_SITE_ORIGIN = 'http://127.0.0.1:3000'
    $env:NEXT_BUILD_DIR = '.next-local-release'
    if (-not $SkipBuild) {
        Push-Location frontend
        try {
            & npm.cmd run build
            if ($LASTEXITCODE -ne 0) { throw 'Website build failed.' }
        } finally { Pop-Location }
    }
    if (-not (Test-Path 'frontend/.next-local-release/BUILD_ID')) { throw 'No local release build exists. Run without -SkipBuild.' }
    $children += Start-DeskService 'api' $python '-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers' (Join-Path $PSScriptRoot 'backend')
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $children += Start-DeskService 'website' $node 'node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000' (Join-Path $PSScriptRoot 'frontend')
    if (-not $SkipRefresh) {
        $children += Start-DeskService 'innovation' $python '-m app.innovation_ingest --watch' (Join-Path $PSScriptRoot 'backend')
        $children += Start-DeskService 'markets' $python '-m app.market_ingest --watch' (Join-Path $PSScriptRoot 'backend')
    }
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        foreach ($child in $children) { if ($child.HasExited) { throw "Service exited. See $logDirectory ($stamp)." } }
        try {
            $api = Invoke-WebRequest 'http://127.0.0.1:8000/health' -TimeoutSec 2
            $site = Invoke-WebRequest 'http://127.0.0.1:3000/markets' -TimeoutSec 5
            if ($api.StatusCode -eq 200 -and $site.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (-not $ready) { throw "Services did not become ready. See $logDirectory ($stamp)." }
    Write-Host "GlobalDesk ready: http://127.0.0.1:3000/  |  Logs: $logDirectory"
    Write-Host 'Keep this launcher running. Press Ctrl+C to stop its services.'
    while ($true) {
        foreach ($child in $children) { if ($child.HasExited) { throw "Service exited. See $logDirectory ($stamp)." } }
        Start-Sleep -Seconds 2
    }
} finally {
    foreach ($child in $children) { if (-not $child.HasExited) { Stop-Process -Id $child.Id -ErrorAction SilentlyContinue } }
}
