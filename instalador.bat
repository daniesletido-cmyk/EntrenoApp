@echo off
cd /d "%~dp0"

echo Instalando dependencias (tarda poco si no hay nada nuevo)...
call npm install
if errorlevel 1 (
  echo Fallo instalando dependencias.
  pause
  exit /b 1
)

set CSC_IDENTITY_AUTO_DISCOVERY=false

echo.
echo Generando el instalador... no cierres esta ventana.
echo.
call npm run build:desktop
if errorlevel 1 (
  echo.
  echo Fallo generando el instalador. Mira el error de arriba.
  pause
  exit /b 1
)

echo.
echo Listo. El instalador esta en la carpeta "release".
start "" explorer "release"
pause
