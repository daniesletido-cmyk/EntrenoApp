@echo off
title EntrenoApp - Servidor Movil para iPhone / Android
chcp 65001 >nul
cls

echo ========================================================
echo       ENTRENOAPP - ACCESO MOVIL (IPHONE / ANDROID)
echo ========================================================
echo.
echo Sincronizando archivos y arrancando servidor...

set PORT=3210
set DB_PATH=%~dp0data\entrenoapp.db

:: Asegurar que los estaticos y public estan dentro de standalone
if exist .next\static (
  xcopy /E /I /Y .next\static .next\standalone\.next\static >nul 2>&1
)
if exist public (
  xcopy /E /I /Y public .next\standalone\public >nul 2>&1
)

:: Matar procesos previos en puerto 3210 si existen
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3210') do (
  taskkill /F /PID %%a >nul 2>&1
)

start /B node .next/standalone/server.js

echo.
echo Conectando tunel seguro Cloudflare...
start cloudflared.exe tunnel --url http://localhost:3210

echo.
echo ========================================================
echo   ¡Listo! Tu aplicacion esta activa para tu movil.
echo   * Recuerda recargar la pagina en el movil para ver los
echo     ultimos cambios (Gimnasio en barra, plan, VAM, etc).
echo ========================================================
echo.
pause
