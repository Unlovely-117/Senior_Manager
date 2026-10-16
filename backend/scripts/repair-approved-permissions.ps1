$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$matrixPath = Join-Path $projectRoot 'backend\config\permission-matrix-approved.csv'
$approvedHash = 'C6AF77260919E4E78568F306F95044B01B2355CCFC66D24AAEFE0CBC3AE210F8'
$actualHash = (Get-FileHash -LiteralPath $matrixPath -Algorithm SHA256).Hash
if ($actualHash -ne $approvedHash) {
    throw 'El archivo de matriz no coincide con el SHA-256 aprobado; no se modifico la base de datos.'
}

$jdkCandidates = [System.Collections.Generic.List[string]]::new()
if ($env:JAVA_HOME) {
    $configuredJavaHome = $env:JAVA_HOME.Trim().TrimEnd('\')
    if ((Split-Path $configuredJavaHome -Leaf) -ieq 'bin') {
        $configuredJavaHome = Split-Path $configuredJavaHome -Parent
    }
    $jdkCandidates.Add($configuredJavaHome)
}
$jdkCandidates.Add((Join-Path $env:LOCALAPPDATA 'SeniorManager\tools\jdk-17'))
$jdkCandidates.Add('C:\Program Files\Java\jdk-17')
foreach ($base in @('C:\Program Files\Java', 'C:\Program Files\Eclipse Adoptium', 'C:\Program Files\Microsoft')) {
    if (Test-Path $base) {
        Get-ChildItem -LiteralPath $base -Directory -Filter '*17*' -ErrorAction SilentlyContinue |
            ForEach-Object { $jdkCandidates.Add($_.FullName) }
    }
}

$selectedJdk = $null
foreach ($candidate in ($jdkCandidates | Select-Object -Unique)) {
    $candidateJava = Join-Path $candidate 'bin\java.exe'
    $releaseFile = Join-Path $candidate 'release'
    if (-not (Test-Path $candidateJava) -or -not (Test-Path $releaseFile)) { continue }
    $releaseInfo = Get-Content -LiteralPath $releaseFile -Raw
    if ($releaseInfo -match '(?m)^JAVA_VERSION="17(?:\.|"|-)') {
        $selectedJdk = $candidate
        break
    }
}
if (-not $selectedJdk) {
    throw 'No se encontro un JDK 17. Instala JDK 17 o configura JAVA_HOME con la carpeta raiz del JDK (por ejemplo, C:\Program Files\Java\jdk-17).'
}
$env:JAVA_HOME = $selectedJdk

$maven = (Get-Command mvn.cmd -ErrorAction SilentlyContinue).Source
if (-not $maven) {
    $mavenCandidate = Join-Path $env:LOCALAPPDATA 'SeniorManager\tools\apache-maven-3.10.0\bin\mvn.cmd'
    if (Test-Path $mavenCandidate) { $maven = $mavenCandidate }
}
if (-not $maven) { throw 'No se encontro Maven 3. Debe estar en PATH o en SeniorManager\tools.' }
$env:PATH = "$($env:JAVA_HOME)\bin;$(Split-Path $maven);$env:PATH"

$jdbcUrl = Read-Host 'URL JDBC de la misma base PostgreSQL que usa la API'
if ($jdbcUrl -notmatch '^jdbc:postgresql://') { throw 'La URL debe comenzar con jdbc:postgresql://.' }
$dbUsername = Read-Host 'Usuario PostgreSQL'
if ([string]::IsNullOrWhiteSpace($dbUsername)) { throw 'El usuario PostgreSQL es obligatorio.' }

$secretNames = @('SENIOR_MANAGE_DB_PASSWORD', 'SENIOR_MANAGE_PERMISSION_BOOTSTRAP_SECRET')
$bootstrapSecret = $null
$locationPushed = $false
try {
    Push-Location $projectRoot
    $locationPushed = $true
    $secureValue = Read-Host 'Contrasena PostgreSQL' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try { $databasePassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ([string]::IsNullOrEmpty($databasePassword)) { throw 'La contrasena PostgreSQL no puede estar vacia.' }
    [Environment]::SetEnvironmentVariable('SENIOR_MANAGE_DB_PASSWORD', $databasePassword, 'Process')
    $databasePassword = $null
    $randomBytes = [System.Array]::CreateInstance([byte], 32)
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $randomGenerator.GetBytes($randomBytes)
        $bootstrapSecret = [Convert]::ToBase64String($randomBytes)
    }
    finally {
        $randomGenerator.Dispose()
        [Array]::Clear($randomBytes, 0, $randomBytes.Length)
    }
    [Environment]::SetEnvironmentVariable('SENIOR_MANAGE_PERMISSION_BOOTSTRAP_SECRET', $bootstrapSecret, 'Process')
    Write-Host 'Secreto temporal generado para esta ejecucion.'
    $env:SENIOR_MANAGE_JDBC_URL = $jdbcUrl.Trim()
    $env:SENIOR_MANAGE_DB_USERNAME = $dbUsername.Trim()
    $env:SENIOR_MANAGE_PERMISSION_MATRIX_SHA256 = $approvedHash
    $repository = Join-Path $env:USERPROFILE '.m2\repository'

    Write-Host 'Aplicando migraciones PostgreSQL V1-V5...'
    $migrationArgs = @(
        "-Dmaven.repo.local=$repository", '-f', 'backend/pom.xml',
        '-Dsenior.manage.mainClass=infrastructure.migrations.ApplyMigrations', 'exec:java'
    )
    & $maven @migrationArgs
    if ($LASTEXITCODE -ne 0) { throw 'Fallaron las migraciones; la matriz de permisos no se aplico.' }

    Write-Host 'Aplicando la matriz aprobada; se solicitara correo y contrasena de administrador.'
    $permissionArgs = @(
        "-Dmaven.repo.local=$repository", '-f', 'backend/pom.xml',
        '-Dsenior.manage.mainClass=infrastructure.bootstrap.PermissionBootstrap',
        '-Dexec.args=--apply-approved backend/config/permission-matrix-approved.csv', 'compile', 'exec:java'
    )
    & $maven @permissionArgs
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo aplicar la matriz aprobada. Revisa el mensaje del CLI.' }

    Write-Host 'Matriz y migraciones aplicadas. Reinicia el backend.'
}
finally {
    $bootstrapSecret = $null
    $databasePassword = $null
    foreach ($name in $secretNames) { [Environment]::SetEnvironmentVariable($name, $null, 'Process') }
    $jdbcUrl = $null
    $dbUsername = $null
    if ($locationPushed) { Pop-Location }
}
