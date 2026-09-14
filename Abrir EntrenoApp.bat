@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo No se encuentra Node.js instalado en este ordenador.
  echo Instala Node.js ^(version 22 o superior^) desde https://nodejs.org
  echo y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo Instalando dependencias la primera vez, puede tardar uno o dos minutos...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo Hubo un error instalando dependencias. El texto de arriba explica que ha fallado.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo ============================================================
echo  EntrenoApp va a arrancar AQUI MISMO, en esta misma ventana.
echo  Se va a abrir una pantalla de carga en tu navegador - se
echo  actualizara sola en cuanto la app este lista.
echo.
echo  Deja esta ventana abierta mientras uses la app - si la cierras,
echo  la app deja de funcionar.
echo ============================================================
echo.

start "" "Cargando EntrenoApp.html"

rem Lanza un monitor en segundo plano para abrir el navegador en cuanto el servidor responda
start "" /b node -e "const http=require('http');const {exec}=require('child_process');function p(){http.get('http://127.0.0.1:3210',(r)=>{exec('start http://localhost:3210');process.exit(0);}).on('error',()=>setTimeout(p,500));}setTimeout(p,600);"

call npm run dev

echo.
echo El servidor de EntrenoApp se ha detenido.
pause
