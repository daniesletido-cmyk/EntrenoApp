@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Actualizar aplicacion
cd /d "%~dp0"

echo ============================================================
echo         ENTRENOAPP - ACTUALIZACION SIN REINSTALAR
echo ============================================================
echo.

rem 1. Comprobar que Node.js esta instalado
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encuentra Node.js instalado en el sistema.
  echo Es necesario para compilar las actualizaciones.
  pause
  exit /b 1
)

rem 2. Si EntrenoApp esta abierta, avisar y cerrarla para evitar bloqueo de archivos
echo [1/4] Comprobando procesos en ejecucion...
tasklist /fi "imagename eq EntrenoApp.exe" | findstr /i "EntrenoApp.exe" >nul 2>nul
if not errorlevel 1 (
  echo   - Cerrando EntrenoApp para poder actualizar los archivos...
  taskkill /f /im EntrenoApp.exe >nul 2>&1
  timeout /t 2 /nobreak >nul
)

rem 3. Compilar Next.js en modo produccion
echo.
echo [2/4] Compilando cambios de codigo y diseno...
call npm run build
if errorlevel 1 (
  echo.
  echo [ERROR] La compilacion ha fallado. Revisa los errores mostrados arriba.
  pause
  exit /b 1
)

rem 4. Preparar assets standalone
echo.
echo [3/4] Empaquetando assets y runtime...
node scripts/copy-standalone-assets.mjs
if errorlevel 1 (
  echo.
  echo [ERROR] Error al preparar assets standalone.
  pause
  exit /b 1
)

rem 5. Desplegar el paquete actualizado en los destinos de la aplicacion
echo.
echo [4/4] Desplegando actualizacion en el sistema...

set USER_BUNDLE=%APPDATA%\EntrenoApp\app-bundle\.next\standalone
set INSTALLED_APP=%LOCALAPPDATA%\Programs\EntrenoApp\resources\app.asar.unpacked\.next\standalone

rem Destino 1: Carpeta de usuario (%APPDATA%\EntrenoApp\app-bundle)
if not exist "%USER_BUNDLE%" mkdir "%USER_BUNDLE%"
robocopy ".next\standalone" "%USER_BUNDLE%" /E /PURGE /NFL /NDL /NJH /NJS /nc /ns /np >nul
if errorlevel 8 (
  echo [AVISO] Hubo incidencias al copiar en %USER_BUNDLE%
) else (
  echo   [OK] Actualizado paquete en Datos de Usuario - AppData\EntrenoApp
)

rem Destino 2: Si esta instalado mediante el .exe en AppData\Local\Programs\EntrenoApp
if exist "%INSTALLED_APP%" (
  robocopy ".next\standalone" "%INSTALLED_APP%" /E /PURGE /NFL /NDL /NJH /NJS /nc /ns /np >nul
  if errorlevel 8 (
    echo [AVISO] No se pudo sobrescribir la carpeta de instalacion local.
  ) else (
    echo   [OK] Actualizada instalacion principal de EntrenoApp.
  )
)

echo.
echo ============================================================
echo       [OK] ACTUALIZACION APLICADA CON EXITO
echo ============================================================
echo.
echo Todas las nuevas funciones y mejoras ya estan disponibles.
echo NO has necesitado desinstalar ni volver a descargar ningun .exe.
echo.
echo Puedes abrir tu acceso directo de EntrenoApp o ejecutar el .exe.
set /p ABRIR="Deseas abrir EntrenoApp ahora? (S/N): "
if /i not "!ABRIR!"=="S" goto :finalizar

if exist "%LOCALAPPDATA%\Programs\EntrenoApp\EntrenoApp.exe" (
  start "" "%LOCALAPPDATA%\Programs\EntrenoApp\EntrenoApp.exe"
  goto :finalizar
)

if exist "release\win-unpacked\EntrenoApp.exe" (
  start "" "release\win-unpacked\EntrenoApp.exe"
  goto :finalizar
)

start "" "Abrir EntrenoApp.bat"

:finalizar
echo.
pause
