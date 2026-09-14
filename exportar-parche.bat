@echo off
title EntrenoApp - Exportar parche para otros equipos
cd /d "%~dp0"

echo ============================================================
echo      ENTRENOAPP - GENERAR PARCHE DE ACTUALIZACION
echo ============================================================
echo.

echo [1/3] Compilando cambios y preparando assets...
call npm run build
if errorlevel 1 (
  echo Error compilando Next.js.
  pause
  exit /b 1
)

node scripts/copy-standalone-assets.mjs
if errorlevel 1 (
  echo Error copiando assets standalone.
  pause
  exit /b 1
)

echo.
echo [2/3] Creando carpeta de distribucion 'parche-entrenoapp'...
if exist "parche-entrenoapp" rmdir /s /q "parche-entrenoapp"
mkdir "parche-entrenoapp\standalone"

robocopy ".next\standalone" "parche-entrenoapp\standalone" /E /NFL /NDL /NJH /NJS /nc /ns /np >nul

copy /y "scripts\instalar-parche-template.bat" "parche-entrenoapp\instalar-actualizacion.bat" >nul

echo.
echo [3/3] Empaquetando en 'Actualizacion-EntrenoApp.zip'...
if exist "Actualizacion-EntrenoApp.zip" del "Actualizacion-EntrenoApp.zip"
powershell -Command "Compress-Archive -Path 'parche-entrenoapp\*' -DestinationPath 'Actualizacion-EntrenoApp.zip' -Force"

echo.
echo ============================================================
echo   [OK] Parche generado: Actualizacion-EntrenoApp.zip
echo ============================================================
echo Puedes enviar este ZIP a cualquier usuario que ya tenga EntrenoApp.
echo Solo tendra que descomprimirlo y ejecutar 'instalar-actualizacion.bat'.
echo.
pause
