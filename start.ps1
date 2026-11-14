<#
.SYNOPSIS
    Script centralizado para iniciar Senior-Manage (Backend API + Frontend Vite).
.DESCRIPTION
    Detecta automaticamente JDK 17, Maven, Node.js y npm.
    Carga variables de entorno desde .env.local (o las solicita de forma segura).
    Genera tokens JWT locales automaticamente.
    Inicia el servidor backend (Java en puerto 8080) y el servidor frontend (Vite en puerto 5173).
    Supervisa la salud de la API y abre el navegador automaticamente.
    Detiene todos los procesos de forma limpia al salir.
.PARAMETER NoNewWindow
    Inicia los procesos en segundo plano dentro de la misma consola en lugar de ventanas independientes.
.PARAMETER NoBrowser
    Deshabilita la apertura automatica del navegador.
.PARAMETER EnvFile
    Ruta a un archivo de configuracion personalizado (por defecto busca .env.local o .env).
.PARAMETER Check
    Ejecuta las comprobaciones de entorno sin iniciar los servidores.
.PARAMETER SkipInstall
    Omite la comprobacion de instalacion de dependencias en frontend.
#>

[CmdletBinding()]
param(
    [switch]$NoNewWindow,
    [switch]$NoBrowser,
    [string]$EnvFile = "",
    [switch]$SkipInstall,
    [switch]$Check,
    [switch]$Migrate
)

$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = (Get-Location).Path
}

# -----------------------------------------------------------------------------
# Funciones Utilitarias y de Diagnostico
# -----------------------------------------------------------------------------

function Write-Header {
    Clear-Host
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "                SENIOR-MANAGE LAUNCHER                     " -ForegroundColor White
    Write-Host "         Sistema Integral de Cuidado Geriatrico             " -ForegroundColor DarkCyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
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
    
    # 1. Si JAVA_HOME esta configurado
    if ($env:JAVA_HOME) {
        $cand = $env:JAVA_HOME.Trim().TrimEnd('\')
        if ((Split-Path $cand -Leaf) -ieq 'bin') { $cand = Split-Path $cand -Parent }
        $candidates.Add($cand)
    }

    # 2. Rutas conocidas del proyecto y herramientas locales
    $candidates.Add((Join-Path $env:LOCALAPPDATA 'SeniorManager\tools\jdk-17'))
    $candidates.Add('C:\Program Files\Java\jdk-17')
    $candidates.Add('C:\Program Files\Eclipse Adoptium\jdk-17')

    # 3. Busqueda en Program Files
    foreach ($base in @('C:\Program Files\Eclipse Adoptium', 'C:\Program Files\Java', 'C:\Program Files\Microsoft', 'C:\Program Files\Zulu', 'C:\Program Files\BellSoft')) {
        if (Test-Path $base -ErrorAction SilentlyContinue) {
            Get-ChildItem -LiteralPath $base -Directory -Filter '*17*' -ErrorAction SilentlyContinue |
                ForEach-Object { $candidates.Add($_.FullName) }
        }
    }

    # Validar candidato que sea verdaderamente Java 17
    foreach ($cand in ($candidates | Select-Object -Unique)) {
        try {
            $javaExe = Join-Path $cand 'bin\java.exe'
            $releaseFile = Join-Path $cand 'release'
            if ((Test-Path -LiteralPath $javaExe -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath $releaseFile -ErrorAction SilentlyContinue)) {
                $releaseContent = Get-Content -LiteralPath $releaseFile -Raw -ErrorAction SilentlyContinue
                if ($releaseContent -match '(?m)^JAVA_VERSION="17(?:\.|"|-)') {
                    return $cand
                }
            }
        } catch {}
    }

    # Verificar si el java en PATH actual es version 17
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
    # 1. Verificar si mvn.cmd o mvn ya esta en PATH
    $mvnCmd = Get-Command mvn.cmd -ErrorAction SilentlyContinue
    if ($mvnCmd) { return $mvnCmd.Source }
    $mvn = Get-Command mvn -ErrorAction SilentlyContinue
    if ($mvn) { return $mvn.Source }

    # 2. Herramienta local del proyecto
    try {
        $candidate = Join-Path $env:LOCALAPPDATA 'SeniorManager\tools\apache-maven-3.10.0\bin\mvn.cmd'
        if (Test-Path -LiteralPath $candidate -ErrorAction SilentlyContinue) { return $candidate }
    } catch {}

    # 3. Rutas estandar en Windows
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

function Test-PortAvailable([int]$port) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return ($null -eq $conn)
}

function Get-PortProcessName([int]$port) {
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn -and $conn.OwningProcess) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            return "$($proc.ProcessName) (PID $($conn.OwningProcess))"
        }
    } catch {}
    return "Desconocido"
}

function Stop-ProcessTree([int]$processId) {
    if ($processId -gt 0) {
        try {
            & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
        } catch {}
    }
}

# -----------------------------------------------------------------------------
# 1. Verificacion de Requisitos Previos
# -----------------------------------------------------------------------------

Write-Header

# A. Java 17
$jdkPath = Find-Jdk17
if (-not $jdkPath) {
    Write-Step "JDK 17" "No se encontro un JDK 17 instalado en el sistema." "FAIL"
    Write-Host "   Por favor instala JDK 17 (Eclipse Adoptium Temurin o Microsoft OpenJDK)" -ForegroundColor Yellow
    Write-Host "   o define la variable JAVA_HOME hacia la carpeta raiz del JDK 17." -ForegroundColor Yellow
    exit 1
}
$env:JAVA_HOME = $jdkPath
$env:PATH = "$(Join-Path $jdkPath 'bin');$env:PATH"
Write-Step "JDK 17" "$jdkPath" "OK"

# B. Maven
$mavenPath = Find-Maven
if (-not $mavenPath) {
    Write-Step "Maven 3" "No se encontro Maven en PATH ni en herramientas locales." "FAIL"
    Write-Host "   Instala Maven 3.9+ o asegurate de que 'mvn.cmd' este en el PATH del sistema." -ForegroundColor Yellow
    exit 1
}
$mavenDir = Split-Path $mavenPath -Parent
if ($env:PATH -notlike "*$mavenDir*") {
    $env:PATH = "$mavenDir;$env:PATH"
}
Write-Step "Maven" "$mavenPath" "OK"

# C. Node.js y npm
$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) { $npmCmd = Get-Command npm -ErrorAction SilentlyContinue }

if (-not $nodeCmd -or -not $npmCmd) {
    Write-Step "Node.js" "Node.js o npm no fueron encontrados en el sistema." "FAIL"
    Write-Host "   Instala Node.js 18+ (https://nodejs.org/) para ejecutar la interfaz de usuario." -ForegroundColor Yellow
    exit 1
}
$nodeVersion = (& $nodeCmd.Source -v 2>&1).Trim()
Write-Step "Node.js" "$nodeVersion ($($nodeCmd.Source))" "OK"

# D. Verificacion de Puertos
$portApi = 8080
$portFrontend = 5173

if (-not (Test-PortAvailable $portApi)) {
    $procName = Get-PortProcessName $portApi
    Write-Step "Puerto $portApi (API)" "Ya esta en uso por: $procName" "WARN"
    Write-Host "   Si es una instancia previa de Senior-Manage, cierrala antes de continuar." -ForegroundColor Yellow
}
if (-not (Test-PortAvailable $portFrontend)) {
    $procName = Get-PortProcessName $portFrontend
    Write-Step "Puerto $portFrontend (Web)" "Ya esta en uso por: $procName" "WARN"
}

# -----------------------------------------------------------------------------
# 2. Carga y Configuracion de Variables de Entorno
# -----------------------------------------------------------------------------

# Buscar archivo de configuracion
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
$autoBrowser = -not $NoBrowser

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
                'SENIOR_MANAGE_PORT'        { $portApi = [int]$val }
                'AUTO_OPEN_BROWSER'         { if ($val -ieq 'false') { $autoBrowser = $false } }
            }
        }
    }
}

# Valores predeterminados para desarrollo si no estan definidos
if (-not $dbUrl) {
    $dbUrl = 'jdbc:postgresql://localhost:5432/senior_manager_migration_dev'
}
if (-not $dbUser) {
    $dbUser = 'senior_manager_app'
}

# Si falta la contrasena de base de datos, solicitarla interactivamente
$shouldPromptSave = $false
if (-not $dbPass) {
    Write-Host ""
    Write-Host "Configuracion de conexion PostgreSQL:" -ForegroundColor Yellow
    Write-Host "  URL:     $dbUrl" -ForegroundColor Gray
    Write-Host "  Usuario: $dbUser" -ForegroundColor Gray
    
    $securePass = Read-Host -Prompt "Ingresa la contrasena para '$dbUser'" -AsSecureString
    if ($null -eq $securePass) {
        Write-Host "[FAIL] La contrasena de base de datos es obligatoria para iniciar la API." -ForegroundColor Red
        exit 1
    }
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
    try {
        $dbPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $shouldPromptSave = -not (Test-Path (Join-Path $projectRoot '.env.local'))
}

# Ofrecer guardar en .env.local para no volver a pedirla
if ($shouldPromptSave -and -not [Console]::IsInputRedirected) {
    Write-Host ""
    $saveChoice = Read-Host "Deseas guardar estas credenciales en '.env.local' para no ingresarlas nuevamente? (S/n)"
    if ($saveChoice -ieq 'S' -or $saveChoice -ieq 'si' -or $saveChoice -eq '') {
        $envLocalContent = @"
# Senior-Manage - Configuracion local de desarrollo
# Archivo protegido e ignorado por Git.
SENIOR_MANAGE_JDBC_URL=$dbUrl
SENIOR_MANAGE_DB_USERNAME=$dbUser
SENIOR_MANAGE_DB_PASSWORD=$dbPass
SENIOR_MANAGE_PORT=$portApi
AUTO_OPEN_BROWSER=$autoBrowser
"@
        Set-Content -Path (Join-Path $projectRoot '.env.local') -Value $envLocalContent -Encoding UTF8
        Write-Step "Guardado" "Credenciales guardadas en .env.local (ignorado por Git)" "OK"
    }
}

# Exportar variables de entorno activas para los subprocesos
$env:SENIOR_MANAGE_JDBC_URL = $dbUrl
$env:SENIOR_MANAGE_DB_USERNAME = $dbUser
$env:SENIOR_MANAGE_DB_PASSWORD = $dbPass
$env:senior_manage_port = $portApi

# Generacion automatica de secreto JWT seguro (32 bytes aleatorios en Base64)
$random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$secretBytes = New-Object byte[] 32
try {
    $random.GetBytes($secretBytes)
    $env:SENIOR_MANAGE_JWT_SECRET = [Convert]::ToBase64String($secretBytes)
} finally {
    [Array]::Clear($secretBytes, 0, $secretBytes.Length)
    $random.Dispose()
}
$env:SENIOR_MANAGE_JWT_KEY_ID = 'local-session-key'
$env:SENIOR_MANAGE_JWT_ISSUER = 'senior-manager-local'
$env:SENIOR_MANAGE_JWT_AUDIENCE = 'senior-manager-local'

Write-Step "PostgreSQL" "$dbUrl ($dbUser)" "OK"
Write-Step "Seguridad JWT" "HS256 (Clave dinamica de sesion generada)" "OK"

# -----------------------------------------------------------------------------
# 3. Preparacion del Frontend (npm install si no existe node_modules)
# -----------------------------------------------------------------------------

$frontendModules = Join-Path $projectRoot 'frontend\node_modules'
if (-not (Test-Path $frontendModules) -and -not $SkipInstall) {
    Write-Host ""
    Write-Step "Dependencias" "Instalando modulos del frontend (primera ejecucion)..." "INFO"
    Push-Location (Join-Path $projectRoot 'frontend')
    try {
        & $npmCmd.Source install
    } finally {
        Pop-Location
    }
    Write-Step "Dependencias" "Modulos de React instalados correctamente." "OK"
}

# -----------------------------------------------------------------------------
# 4. Lanzamiento de Servicios (Backend + Frontend)
# -----------------------------------------------------------------------------

if ($Migrate) {
    Write-Host ""
    Write-Step "Flyway" "Aplicando migraciones Flyway V1 a V7 en PostgreSQL..." "INFO"
    $migrationArgs = @(
        '-f', 'backend/pom.xml',
        '-Dsenior.manage.mainClass=infrastructure.migrations.ApplyMigrations',
        'exec:java'
    )
    & $mavenPath @migrationArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[FAIL] Fallaron las migraciones Flyway. Revisa los mensajes de error anteriores." -ForegroundColor Red
        exit 1
    }
    Write-Step "Flyway" "Migraciones V1 a V7 aplicadas exitosamente." "OK"
}

if ($Check) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  [OK] Verificacion exitosa: El entorno esta listo para iniciar." -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    return
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "               INICIANDO SERVICIOS LOCALES                 " -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$backendProc = $null
$frontendProc = $null

$cleanupBlock = {
    Write-Host ""
    Write-Host "Deteniendo servicios de Senior-Manage..." -ForegroundColor Yellow
    if ($backendProc -and -not $backendProc.HasExited) {
        Write-Host "  -> Deteniendo Backend API (PID $($backendProc.Id))..." -ForegroundColor Gray
        Stop-ProcessTree $backendProc.Id
    }
    if ($frontendProc -and -not $frontendProc.HasExited) {
        Write-Host "  -> Deteniendo Frontend Vite (PID $($frontendProc.Id))..." -ForegroundColor Gray
        Stop-ProcessTree $frontendProc.Id
    }

    # Limpiar secretos en memoria
    Remove-Item Env:SENIOR_MANAGE_DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:SENIOR_MANAGE_JWT_SECRET -ErrorAction SilentlyContinue
    Remove-Item Env:SENIOR_MANAGE_JWT_KEY_ID -ErrorAction SilentlyContinue
    Remove-Item Env:SENIOR_MANAGE_JWT_ISSUER -ErrorAction SilentlyContinue
    Remove-Item Env:SENIOR_MANAGE_JWT_AUDIENCE -ErrorAction SilentlyContinue

    Write-Host "[OK] Todos los servicios han sido detenidos correctamente." -ForegroundColor Green
}

try {
    if ($NoNewWindow) {
        # Modo en la misma consola / background
        Write-Host "Modo integrado: Iniciando backend en segundo plano..." -ForegroundColor Cyan
        $backendInfo = New-Object System.Diagnostics.ProcessStartInfo
        $backendInfo.FileName = "mvn.cmd"
        $backendInfo.Arguments = "-f backend/pom.xml exec:java"
        $backendInfo.WorkingDirectory = $projectRoot
        $backendInfo.UseShellExecute = $false
        $backendProc = [System.Diagnostics.Process]::Start($backendInfo)

        Write-Host "Iniciando frontend en segundo plano..." -ForegroundColor Cyan
        $frontendInfo = New-Object System.Diagnostics.ProcessStartInfo
        $frontendInfo.FileName = "cmd.exe"
        $frontendInfo.Arguments = "/c npm --prefix frontend run dev"
        $frontendInfo.WorkingDirectory = $projectRoot
        $frontendInfo.UseShellExecute = $false
        $frontendProc = [System.Diagnostics.Process]::Start($frontendInfo)
    } else {
        # Modo ventanas dedicadas con TTY interactiva
        Write-Host "Lanzando ventana para Backend API..." -ForegroundColor Cyan
        $backendCmd = "`$host.UI.RawUI.WindowTitle = 'Senior-Manage [Backend API :$portApi]'; Write-Host '=== Backend API Senior-Manage ===' -ForegroundColor Cyan; mvn -f backend/pom.xml exec:java"
        $backendProc = Start-Process powershell.exe -ArgumentList "-NoExit", "-NoProfile", "-Command", $backendCmd -WorkingDirectory $projectRoot -PassThru

        Write-Host "Lanzando ventana para Frontend Web..." -ForegroundColor Cyan
        $frontendCmd = "`$host.UI.RawUI.WindowTitle = 'Senior-Manage [Frontend Web :$portFrontend]'; Write-Host '=== Frontend Web Vite ===' -ForegroundColor Cyan; npm --prefix frontend run dev"
        $frontendProc = Start-Process powershell.exe -ArgumentList "-NoExit", "-NoProfile", "-Command", $frontendCmd -WorkingDirectory $projectRoot -PassThru
    }

    Write-Host ""
    Write-Host "Servicios lanzados:" -ForegroundColor White
    Write-Host "  * Backend API:  http://127.0.0.1:$portApi/api" -ForegroundColor Green
    Write-Host "  * Frontend Web: http://localhost:$portFrontend" -ForegroundColor Green
    Write-Host ""

    # -------------------------------------------------------------------------
    # 5. Espera de Salud del Backend y Apertura de Navegador
    # -------------------------------------------------------------------------

    Write-Host "Comprobando disponibilidad de la API (/api/health)..." -NoNewline -ForegroundColor Gray
    $apiReady = $false
    $timeout = 45
    $elapsed = 0

    while ($elapsed -lt $timeout -and -not $apiReady) {
        Start-Sleep -Seconds 2
        $elapsed += 2
        Write-Host "." -NoNewline -ForegroundColor Gray
        try {
            $healthResponse = Invoke-RestMethod -Uri "http://127.0.0.1:$portApi/api/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
            if ($healthResponse.status -eq 'ok') {
                $apiReady = $true
            }
        } catch {
            # Si responde 503, leer el motivo reportado por la API
            if ($_.Exception.Response) {
                try {
                    $stream = $_.Exception.Response.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd() | ConvertFrom-Json
                    if ($body.error) {
                        Write-Host ""
                        Write-Host "  [WARN] Aviso de la API: $($body.error)" -ForegroundColor Yellow
                        break
                    }
                } catch {}
            }
        }
    }

    Write-Host ""
    if ($apiReady) {
        Write-Host "[OK] Backend en linea y verificado exitosamente." -ForegroundColor Green
    } else {
        Write-Host "[INFO] El backend se esta inicializando o requiere atencion (ver ventana del Backend)." -ForegroundColor Yellow
    }

    # Abrir navegador automaticamente
    if ($autoBrowser) {
        Write-Host "Abriendo el navegador en http://localhost:$portFrontend..." -ForegroundColor Cyan
        Start-Process "http://localhost:$portFrontend"
    }

    # -------------------------------------------------------------------------
    # 6. Monitoreo y Espera Activa
    # -------------------------------------------------------------------------

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "   El sistema esta en ejecucion.                             " -ForegroundColor White
    Write-Host "   Presiona [ENTER] o escribe 'q' para detener los servicios." -ForegroundColor White
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""

    while ($true) {
        if ($backendProc.HasExited) {
            Write-Host "[WARN] La ventana del Backend se ha cerrado." -ForegroundColor Yellow
            break
        }
        if ($frontendProc.HasExited) {
            Write-Host "[WARN] La ventana del Frontend se ha cerrado." -ForegroundColor Yellow
            break
        }

        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq [ConsoleKey]::Enter -or $key.Key -eq [ConsoleKey]::Q) {
                break
            }
        }
        Start-Sleep -Milliseconds 400
    }

} finally {
    & $cleanupBlock
}
