<#
.SYNOPSIS
    Aplica las migraciones Flyway (V1 a V7) a la base de datos PostgreSQL de Senior-Manage.
.DESCRIPTION
    Carga las credenciales de PostgreSQL desde .env.local (o las solicita de forma segura),
    detecta JDK 17 y Maven, y ejecuta ApplyMigrations con Flyway.
#>

[CmdletBinding()]
param(
    [string]$EnvFile = ""
)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = (Get-Location).Path
}

function Write-Step([string]$step, [string]$message, [string]$status = "INFO") {
    $color = switch ($status) {
        "OK"    { "Green" }
        "WARN"  { "Yellow" }
        "FAIL"  { "Red" }
        default { "Cyan" }
    }
    $tag = switch ($status) {
        "OK"    { "[OK]  " }
        "WARN"  { "[WARN]" }
        "FAIL"  { "[FAIL]" }
        default { "[INFO]" }
    }
    Write-Host " $tag " -NoNewline -ForegroundColor $color
    Write-Host ($step + ": ") -NoNewline -ForegroundColor White
    Write-Host $message -ForegroundColor Gray
}

function Find-Jdk17 {
    $candidates = [System.Collections.Generic.List[string]]::new()
    if ($env:JAVA_HOME) {
        $cand = $env:JAVA_HOME.Trim().TrimEnd('\')
        if ((Split-Path $cand -Leaf) -ieq 'bin') { $cand = Split-Path $cand -Parent }
        $candidates.Add($cand)
    }
    $candidates.Add((Join-Path $env:LOCALAPPDATA 'SeniorManager\tools\jdk-17'))
    $candidates.Add('C:\Program Files\Java\jdk-17')
    $candidates.Add('C:\Program Files\Eclipse Adoptium\jdk-17')
    foreach ($base in @('C:\Program Files\Eclipse Adoptium', 'C:\Program Files\Java', 'C:\Program Files\Microsoft', 'C:\Program Files\Zulu', 'C:\Program Files\BellSoft')) {
        if (Test-Path $base -ErrorAction SilentlyContinue) {
            Get-ChildItem -LiteralPath $base -Directory -Filter '*17*' -ErrorAction SilentlyContinue |
                ForEach-Object { $candidates.Add($_.FullName) }
        }
    }
    foreach ($cand in ($candidates | Select-Object -Unique)) {
        try {
            $javaExe = Join-Path $cand 'bin\java.exe'
            $releaseFile = Join-Path $cand 'release'
            if ((Test-Path -LiteralPath $javaExe -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath $releaseFile -ErrorAction SilentlyContinue)) {
                $releaseContent = Get-Content -LiteralPath $releaseFile -Raw -ErrorAction SilentlyContinue
                if ($releaseContent -match '(?m)^JAVA_VERSION="17(?:\.|"|-)') { return $cand }
            }
        } catch {}
    }
    $pathJava = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($pathJava) {
        $verOutput = & $pathJava.Source -version 2>&1 | Out-String
        if ($verOutput -match '"17\.') {
            $binDir = Split-Path $pathJava.Source -Parent
            return (Split-Path $binDir -Parent)
        }
    }
    return $null
}

function Find-Maven {
    $mvnCmd = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if ($mvnCmd) { return $mvnCmd.Source }
    $mvn = Get-Command mvn -ErrorAction SilentlyContinue
    if ($mvn) { return $mvn.Source }
    try {
        $candidate = Join-Path $env:LOCALAPPDATA 'SeniorManager\tools\apache-maven-3.10.0\bin\mvn.cmd'
        if (Test-Path -LiteralPath $candidate -ErrorAction SilentlyContinue) { return $candidate }
    } catch {}
    $searchPaths = @(
        'C:\Program Files\apache-maven*\bin\mvn.cmd',
        'C:\Program Files (x86)\apache-maven*\bin\mvn.cmd',
        'C:\tools\apache-maven*\bin\mvn.cmd',
        'C:\ProgramData\chocolatey\bin\mvn.cmd'
    )
    foreach ($pattern in $searchPaths) {
        $found = Resolve-Path $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.Path }
    }
    return $null
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         SENIOR-MANAGE: APLICAR MIGRACIONES FLYWAY          " -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Validar JDK y Maven
$jdkPath = Find-Jdk17
if (-not $jdkPath) {
    Write-Step "JDK 17" "No se encontro un JDK 17 en el sistema." "FAIL"
    exit 1
}
$env:JAVA_HOME = $jdkPath
$env:PATH = "$(Join-Path $jdkPath 'bin');$env:PATH"
Write-Step "JDK 17" "$jdkPath" "OK"

$mavenPath = Find-Maven
if (-not $mavenPath) {
    Write-Step "Maven 3" "No se encontro Maven en PATH." "FAIL"
    exit 1
}
$mavenDir = Split-Path $mavenPath -Parent
if ($env:PATH -notlike "*$mavenDir*") {
    $env:PATH = "$mavenDir;$env:PATH"
}
Write-Step "Maven" "$mavenPath" "OK"

# 2. Cargar configuracion de Base de Datos
$envCandidates = @()
if ($EnvFile) { $envCandidates += (Join-Path $projectRoot $EnvFile) }
$envCandidates += (Join-Path $projectRoot '.env.local')
$envCandidates += (Join-Path $projectRoot '.env')

$loadedEnvFile = $null
foreach ($file in $envCandidates) {
    if (Test-Path $file) {
        $loadedEnvFile = $file
        break
    }
}

$dbUrl = $env:SENIOR_MANAGE_JDBC_URL
$dbUser = $env:SENIOR_MANAGE_DB_USERNAME
$dbPass = $env:SENIOR_MANAGE_DB_PASSWORD

if ($loadedEnvFile) {
    Write-Step "Configuracion" "Cargando variables desde $loadedEnvFile" "INFO"
    Get-Content -LiteralPath $loadedEnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and ($line -match '^([^=]+)=(.*)$')) {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            switch ($key) {
                'SENIOR_MANAGE_JDBC_URL'    { if (-not $dbUrl)  { $dbUrl = $val } }
                'SENIOR_MANAGE_DB_USERNAME' { if (-not $dbUser) { $dbUser = $val } }
                'SENIOR_MANAGE_DB_PASSWORD' { if (-not $dbPass) { $dbPass = $val } }
            }
        }
    }
}

if (-not $dbUrl) { $dbUrl = 'jdbc:postgresql://localhost:5432/senior_manager_migration_dev' }
if (-not $dbUser) { $dbUser = 'senior_manager_app' }

if (-not $dbPass) {
    Write-Host ""
    Write-Host "Configuracion PostgreSQL:" -ForegroundColor Yellow
    Write-Host "  URL:     $dbUrl" -ForegroundColor Gray
    Write-Host "  Usuario: $dbUser" -ForegroundColor Gray
    $securePass = Read-Host -Prompt "Ingresa la contrasena para '$dbUser'" -AsSecureString
    if ($null -eq $securePass) {
        Write-Host "[FAIL] La contrasena de base de datos es obligatoria." -ForegroundColor Red
        exit 1
    }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    try { $dbPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

$env:SENIOR_MANAGE_JDBC_URL = $dbUrl
$env:SENIOR_MANAGE_DB_USERNAME = $dbUser
$env:SENIOR_MANAGE_DB_PASSWORD = $dbPass

# 3. Ejecutar ApplyMigrations
Write-Host ""
Write-Step "Flyway" "Aplicando migraciones V1 a V7 en PostgreSQL..." "INFO"

Push-Location $projectRoot
try {
    $migrationArgs = @(
        '-f', 'backend/pom.xml',
        '-Dsenior.manage.mainClass=infrastructure.migrations.ApplyMigrations',
        'exec:java'
    )
    & $mavenPath @migrationArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[FAIL] Fallaron las migraciones. Revisa los mensajes de error anteriores." -ForegroundColor Red
        exit 1
    }
    Write-Host ""
    Write-Step "Flyway" "Migraciones V1 a V7 aplicadas exitosamente." "OK"
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  [OK] El esquema de PostgreSQL esta completamente actualizado." -ForegroundColor Green
    Write-Host "       Ya puedes iniciar el backend con .\start.ps1" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
} finally {
    Pop-Location
    Remove-Item Env:SENIOR_MANAGE_DB_PASSWORD -ErrorAction SilentlyContinue
}

