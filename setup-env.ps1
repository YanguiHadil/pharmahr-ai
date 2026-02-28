param(
    [string]$ApiKey,
    [switch]$Force
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envExamplePath = Join-Path $scriptDir ".env.example"
$envPath = Join-Path $scriptDir ".env"

if (!(Test-Path $envExamplePath)) {
    Write-Error "Fichier .env.example introuvable dans $scriptDir"
    exit 1
}

if ((Test-Path $envPath) -and -not $Force) {
    Write-Host ".env existe déjà. Utilise -Force pour le recréer." -ForegroundColor Yellow
} else {
    Copy-Item $envExamplePath $envPath -Force
    Write-Host ".env créé depuis .env.example" -ForegroundColor Green
}

if ($ApiKey) {
    $content = Get-Content $envPath
    $updated = $false

    $content = $content | ForEach-Object {
        if ($_ -match '^GROQ_API_KEY=') {
            $updated = $true
            "GROQ_API_KEY=$ApiKey"
        } else {
            $_
        }
    }

    if (-not $updated) {
        $content += "GROQ_API_KEY=$ApiKey"
    }

    Set-Content -Path $envPath -Value $content
    Write-Host "GROQ_API_KEY mise à jour dans .env" -ForegroundColor Green
} else {
    Write-Host "Ajoute ta clé dans .env : GROQ_API_KEY=..." -ForegroundColor Cyan
}
