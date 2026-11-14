@echo off
setlocal
title Aplicando Migraciones Senior-Manage...

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0migrate.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudieron aplicar las migraciones.
    pause
) else (
    echo.
    echo Presiona cualquier tecla para continuar...
    pause >nul
)
endlocal

