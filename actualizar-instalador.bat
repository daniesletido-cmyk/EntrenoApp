@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Actualizar instalador
cd /d "%~dp0"

if not exist package.json (
  echo No encuentro package.json en esta carpeta.
  echo Este archivo debe estar dentro de la carpeta EntrenoApp.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo No se ha encontrado Node.js instalado en este ordenador.
  echo Instalalo desde https://nodejs.org ^(version LTS, boton verde^) y luego
  echo vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

rem Misma comprobacion que generar-instalador.bat: (re)instala si hace
rem falta, sin repetirlo si ya esta todo al dia.
set NEED_INSTALL=0
if not exist node_modules\.bin\next.cmd set NEED_INSTALL=1
if not exist node_modules\.bin\electron-builder.cmd set NEED_INSTALL=1
if not exist node_modules\.entreno-install-lock.json (
  set NEED_INSTALL=1
) else (
  fc /b package-lock.json node_modules\.entreno-install-lock.json >nul 2>nul
  if errorlevel 1 set NEED_INSTALL=1
)

if %NEED_INSTALL%==1 (
  echo.
  echo No encuentro las dependencias instaladas ^(o estan desactualizadas^).
  echo Ejecuta primero generar-instalador.bat, que las instala antes de
  echo generar el instalador.
  echo.
  pause
  exit /b 1
)

set CSC_IDENTITY_AUTO_DISCOVERY=false

echo.
echo Generando una actualizacion del instalador con los ultimos cambios...
echo No cierres esta ventana hasta que veas "Instalador actualizado" o el
echo detalle de un error.
echo.
del build-desktop-log.txt >nul 2>nul
call npm run build:desktop > build-desktop-log.txt 2>&1
if errorlevel 1 (
  echo.
  echo No se ha podido generar la actualizacion. Este es el detalle del error:
  echo ============================================================
  type build-desktop-log.txt
  echo ============================================================
  echo.
  echo (Este mismo texto se ha guardado en el archivo build-desktop-log.txt,
  echo  dentro de esta carpeta, por si necesitas compartirlo.)
  echo.
  pause
  exit /b 1
)
del build-desktop-log.txt >nul 2>nul

echo.
echo Instalador actualizado correctamente en la carpeta "release".
start "" explorer "release"
pause
exit /b 0
