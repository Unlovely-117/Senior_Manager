@echo off
setlocal
title Senior-Manage Launcher

echo ============================================================
echo           Iniciando Senior-Manage (Full Stack)
echo ============================================================
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Ocurrio un problema al iniciar Senior-Manage.
    echo Revisa los mensajes anteriores para mas detalles.
    echo.
    pause
)
endlocal

