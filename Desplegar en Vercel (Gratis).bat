@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Despliegue en Vercel (Nube 24/7 Gratis)
cd /d "%~dp0"

echo ============================================================
echo       EntrenoApp - Desplegar en Vercel (100%% Gratis 24/7)
echo ============================================================
echo.
echo URL permanente: https://entrenoapp-blond.vercel.app
echo.

echo [1/2] Compilando y subiendo a Vercel Produccion...
echo.
call npx -y vercel deploy --prod --yes

if errorlevel 1 (
  echo.
  echo [ERROR] Hubo un problema al desplegar en Vercel.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Despliegue finalizado con exito en Vercel.
echo  Tu enlace permanente unico para movil y PC:
echo  https://entrenoapp-blond.vercel.app
echo ============================================================
echo.
pause
