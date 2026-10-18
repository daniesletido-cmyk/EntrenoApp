@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Acceso Remoto desde iPhone (Tunel Seguro Gratuito)
cd /d "%~dp0"

echo ============================================================
echo      EntrenoApp - Acceso Remoto desde tu iPhone / Movil
echo       (Tunel Cloudflare Gratuito - Sin depender de Railway)
echo ============================================================
echo.

set CF_EXE=cloudflared.exe
if not exist "%CF_EXE%" (
  if exist "..\FinanzasApp\AppGestionFinanciera\cloudflared.exe" (
    copy "..\FinanzasApp\AppGestionFinanciera\cloudflared.exe" "%CF_EXE%" >nul
  ) else (
    echo Descargando componente seguro de conexion remota...
    curl.exe -sL -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  )
)

set TARGET_PORT=3000
netstat -ano | findstr ":3000 " >nul 2>nul
if errorlevel 1 (
  echo El servidor de EntrenoApp no estaba iniciado. Arrancando servidor local...
  start /min "EntrenoApp Local" cmd /c "npm run dev"
  timeout /t 5 >nul
)

echo.
echo ============================================================
echo  INSTRUCCIONES:
echo  1. Deja esta ventana abierta mientras uses la app fuera.
echo  2. Abre en Safari de tu iPhone el enlace HTTPS que saldra abajo.
echo  3. En Safari: Compartir -^> 'Anadir a la pantalla de inicio'.
echo ============================================================
echo.
echo Conectando con EntrenoApp en el puerto !TARGET_PORT!...
cloudflared.exe tunnel --url http://127.0.0.1:!TARGET_PORT!

pause
