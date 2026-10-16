$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$jdkCandidates = [System.Collections.Generic.List[string]]::new()
if ($env:JAVA_HOME) {
    $configuredJavaHome = $env:JAVA_HOME.Trim().TrimEnd('\')
    if ((Split-Path $configuredJavaHome -Leaf) -ieq 'bin') { $configuredJavaHome = Split-Path $configuredJavaHome -Parent }
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
    $java = Join-Path $candidate 'bin\java.exe'
    $release = Join-Path $candidate 'release'
    if ((Test-Path $java) -and (Test-Path $release) -and (Get-Content -LiteralPath $release -Raw) -match '(?m)^JAVA_VERSION="17(?:\.|"|-)') {
        $selectedJdk = $candidate
        break
    }
}
if (-not $selectedJdk) { throw 'No se encontro JDK 17. Configura JAVA_HOME con la carpeta raiz del JDK.' }
$env:JAVA_HOME = $selectedJdk

$maven = (Get-Command mvn.cmd -ErrorAction SilentlyContinue).Source
if (-not $maven) {
    $candidateMaven = Join-Path $env:LOCALAPPDATA 'SeniorManager\tools\apache-maven-3.10.0\bin\mvn.cmd'
    if (Test-Path $candidateMaven) { $maven = $candidateMaven }
}
if (-not $maven) { throw 'No se encontro Maven 3.' }
$env:PATH = "$($env:JAVA_HOME)\bin;$(Split-Path $maven);$env:PATH"

$jdbcUrl = Read-Host 'URL JDBC PostgreSQL de la base que usa la API'
if ($jdbcUrl -notmatch '^jdbc:postgresql://') { throw 'La URL debe comenzar con jdbc:postgresql://.' }
$dbUsername = Read-Host 'Usuario PostgreSQL'
if ([string]::IsNullOrWhiteSpace($dbUsername)) { throw 'El usuario PostgreSQL es obligatorio.' }

$locationPushed = $false
try {
    Push-Location $projectRoot
    $locationPushed = $true
    $securePassword = Read-Host 'Contrasena PostgreSQL' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    try { $databasePassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ([string]::IsNullOrEmpty($databasePassword)) { throw 'La contrasena PostgreSQL no puede estar vacia.' }

    $env:SENIOR_MANAGE_JDBC_URL = $jdbcUrl.Trim()
    $env:SENIOR_MANAGE_DB_USERNAME = $dbUsername.Trim()
    [Environment]::SetEnvironmentVariable('SENIOR_MANAGE_DB_PASSWORD', $databasePassword, 'Process')
    $databasePassword = $null
    $repository = Join-Path $env:USERPROFILE '.m2\repository'
    $arguments = @(
        "-Dmaven.repo.local=$repository", '-f', 'backend/pom.xml',
        '-Dsenior.manage.mainClass=infrastructure.bootstrap.CreateAdministrator', 'compile', 'exec:java'
    )
    & $maven @arguments
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear la cuenta administradora. Revisa el mensaje del CLI.' }
}
finally {
    [Environment]::SetEnvironmentVariable('SENIOR_MANAGE_JDBC_URL', $null, 'Process')
    [Environment]::SetEnvironmentVariable('SENIOR_MANAGE_DB_USERNAME', $null, 'Process')
    [Environment]::SetEnvironmentVariable('SENIOR_MANAGE_DB_PASSWORD', $null, 'Process')
    $databasePassword = $null
    $jdbcUrl = $null
    $dbUsername = $null
    if ($locationPushed) { Pop-Location }
}
