@echo off
title EntrenoApp - Instalar actualizacion
cd /d "%~dp0"

echo ============================================================
echo        ENTRENOAPP - INSTALANDO ACTUALIZACION
echo ============================================================
echo.

rem Cerrar EntrenoApp si esta abierta
taskkill /f /im EntrenoApp.exe >nul 2>&1
timeout /t 1 /nobreak >nul

set USER_BUNDLE=%APPDATA%\EntrenoApp\app-bundle\.next\standalone
set INSTALLED_APP=%LOCALAPPDATA%\Programs\EntrenoApp\resources\app.asar.unpacked\.next\standalone

if not exist "%USER_BUNDLE%" mkdir "%USER_BUNDLE%"
robocopy "standalone" "%USER_BUNDLE%" /E /PURGE /NFL /NDL /NJH /NJS /nc /ns /np >nul

if exist "%INSTALLED_APP%" (
  robocopy "standalone" "%INSTALLED_APP%" /E /PURGE /NFL /NDL /NJH /NJS /nc /ns /np >nul
)

echo.
echo ============================================================
echo       [OK] ACTUALIZACION INSTALADA CON EXITO
echo ============================================================
echo.
echo Ya puedes abrir EntrenoApp con todas las novedades.
pause
