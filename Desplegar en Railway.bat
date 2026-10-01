@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Despliegue en Railway (Nube 24/7)
cd /d "%~dp0"

echo ============================================================
echo       EntrenoApp - Desplegar en la Nube (Railway 24/7)
echo ============================================================
echo.
echo URL permanente: https://entrenoapp-production-f07b.up.railway.app
echo.

call railway whoami >nul 2>&1
if errorlevel 1 (
  echo [1/3] Primero necesitas iniciar sesion en Railway.
  echo Se abrira tu navegador para que inicies sesion con tu cuenta.
  echo.
  pause
  call railway login
  if errorlevel 1 (
    echo.
    echo No se ha podido iniciar sesion en Railway.
    pause
    exit /b 1
  )
)

echo [2/3] Enlazando al proyecto y servicio fijo...
call railway link -p 69866035-68d1-422f-b335-0dcfbe2431fa -s d310f63f-8a44-4df6-ab57-3c59767283bc -e production

echo.
echo [3/3] Subiendo y actualizando EntrenoApp en Railway...
echo.
call railway up --service entrenoapp --detach

echo.
echo ============================================================
echo  Despliegue finalizado con exito.
echo  Tu enlace permanente unico para movil y PC:
echo  https://entrenoapp-production-f07b.up.railway.app
echo ============================================================
echo.
pause
exit /b 0
