$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$jdk = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
if (-not (Test-Path (Join-Path $jdk 'bin\java.exe'))) {
    throw 'No se encontro el JDK 17 esperado. Configura JAVA_HOME con la carpeta raiz del JDK 17.'
}
$env:JAVA_HOME = $jdk
$env:PATH = "$(Join-Path $jdk 'bin');$env:PATH"
$env:SENIOR_MANAGE_JDBC_URL = 'jdbc:postgresql://localhost:5432/senior_manager_migration_dev'
$env:SENIOR_MANAGE_DB_USERNAME = 'senior_manager_app'

$securePassword = Read-Host -Prompt 'Contrasena PostgreSQL para senior_manager_app' -AsSecureString
if ($null -eq $securePassword) {
    throw 'La contrasena PostgreSQL es obligatoria.'
}
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:SENIOR_MANAGE_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
}

$random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$secretBytes = New-Object byte[] 32
try {
    $random.GetBytes($secretBytes)
    $env:SENIOR_MANAGE_JWT_SECRET = [Convert]::ToBase64String($secretBytes)
}
finally {
    [Array]::Clear($secretBytes, 0, $secretBytes.Length)
    $random.Dispose()
}
$env:SENIOR_MANAGE_JWT_KEY_ID = 'local-session-key'
$env:SENIOR_MANAGE_JWT_ISSUER = 'senior-manager-local'
$env:SENIOR_MANAGE_JWT_AUDIENCE = 'senior-manager-local'

Push-Location $projectRoot
try {
    Write-Host 'Iniciando Senior Manager API en http://127.0.0.1:8080'
    & mvn -f backend/pom.xml exec:java
    if ($LASTEXITCODE -ne 0) {
        throw 'Maven termino con error; revisa el mensaje anterior.'
    }
}
finally {
    Pop-Location
    Remove-Item Env:SENIOR_MANAGE_DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:SENIOR_MANAGE_JWT_SECRET -ErrorAction SilentlyContinue
    Remove-Item Env:SENIOR_MANAGE_JWT_KEY_ID -ErrorAction SilentlyContinue
    Remove-Item Env:SENIOR_MANAGE_JWT_ISSUER -ErrorAction SilentlyContinue
    Remove-Item Env:SENIOR_MANAGE_JWT_AUDIENCE -ErrorAction SilentlyContinue
}
