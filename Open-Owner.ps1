param([switch]$PrintLink)
$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot 'backend')
try {
    $ownerLink = & .\.venv\Scripts\python.exe -m app.owner_access issue
    if ($LASTEXITCODE -ne 0) { throw 'Owner link generation failed. Apply database migrations and check the API setup first.' }
    if ($PrintLink) { Write-Output $ownerLink } else {
        # The fragment token is not sent to the server in URL requests or access logs.
        Start-Process -FilePath $ownerLink -WindowStyle Hidden
    }
} finally { Pop-Location }
