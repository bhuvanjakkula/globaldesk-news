param([ValidateSet('Api', 'Website', 'Docker', 'Innovation', 'Markets')][string]$Service = 'Website')
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if ($Service -eq 'Docker') {
    if (-not (Test-Path .env)) { Copy-Item .env.example .env }
    docker compose up --build -d
    exit $LASTEXITCODE
}
if ($Service -in @('Api', 'Innovation', 'Markets')) {
    Set-Location backend
    $python = Join-Path $PWD '.venv\Scripts\python.exe'
    if (-not (Test-Path $python)) { throw 'Create backend/.venv and install requirements-dev.txt first; see README.md.' }
    if ($Service -eq 'Innovation') {
        & $python -m app.innovation_ingest --watch
        exit $LASTEXITCODE
    }
    if ($Service -eq 'Markets') {
        & $python -m app.market_ingest --watch
        exit $LASTEXITCODE
    }
    & $python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $python -m app.seed
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
    exit $LASTEXITCODE
}
Set-Location frontend
npm.cmd run dev -- --hostname 127.0.0.1
exit $LASTEXITCODE
