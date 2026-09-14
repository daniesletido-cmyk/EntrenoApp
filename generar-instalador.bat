@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Generar instalador
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

rem (Re)instala dependencias si node_modules falta/esta incompleto, o si
rem package-lock.json ha cambiado desde la ultima instalacion (por ejemplo,
rem al actualizar la version de electron-builder).
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
  if exist node_modules (
    echo.
    echo Hay una actualizacion que instalar ^(o la instalacion anterior estaba
    echo incompleta^). Se va a limpiar y a instalar de nuevo, esto puede tardar
    echo varios minutos...
    echo No cierres esta ventana hasta que termine.
    echo.
    rmdir /s /q node_modules
  ) else (
    echo.
    echo Preparando EntrenoApp por primera vez, esto puede tardar varios minutos...
    echo No cierres esta ventana hasta que termine.
    echo.
  )
  rem Sin redirigir a ningun archivo: npm escribe directamente en esta
  rem ventana, asi ves en vivo que sigue trabajando (avisos "npm warn" son
  rem normales, no son errores).
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo Hubo un problema instalando las dependencias ^(mira el detalle mas
    echo arriba en esta misma ventana^).
    echo.
    pause
    exit /b 1
  )
  if not exist node_modules\.bin\next.cmd (
    echo.
    echo La instalacion parece haber terminado, pero falta un componente necesario.
    echo.
    pause
    exit /b 1
  )
  copy /y package-lock.json node_modules\.entreno-install-lock.json >nul
  echo.
  echo Instalacion completada correctamente.
)

rem Borra cualquier "release" de una generacion anterior antes de empezar,
rem para que no se cuele nada de una version vieja dentro del instalador
rem nuevo.
if exist release rmdir /s /q release

rem Evita que electron-builder intente usar herramientas de firma de codigo
rem (la app no va firmada digitalmente - no tenemos certificado).
set CSC_IDENTITY_AUTO_DISCOVERY=false

echo.
echo Generando el instalador de EntrenoApp...
echo Esto compila la app y luego empaqueta un instalador de Windows. En este
echo paso concreto puede que NO veas texto moviendose en pantalla durante un
echo rato - es normal, no se ha colgado. La parte mas pesada ^(los
echo componentes de Electron^) ya deberia estar descargada de un intento
echo anterior. NO CIERRES ESTA VENTANA - espera SIEMPRE a ver el mensaje
echo "Instalador generado correctamente" o el detalle de un error antes de
echo cerrarla.
echo.

rem Se guarda tambien en un archivo (build-desktop-log.txt): si el paso de
rem empaquetado falla en silencio, asi queda el error real guardado. Si
rem falla, se muestra igualmente en pantalla (con "type" mas abajo).
del build-desktop-log.txt >nul 2>nul
call npm run build:desktop > build-desktop-log.txt 2>&1
if errorlevel 1 (
  echo.
  echo No se ha podido generar el instalador. Este es el detalle del error:
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
echo Instalador generado correctamente.
echo Dentro de la carpeta "release" tienes EntrenoApp-Instalador-0.1.0.exe
echo Doble clic en el para instalar EntrenoApp con acceso directo en el
echo escritorio y en el menu Inicio, igual que cualquier otro programa.
echo.
echo Nota: al no estar firmado digitalmente, es posible que Windows muestre
echo un aviso de "Windows protegio su PC" la primera vez que lo abras. Pulsa
echo "Mas informacion" y luego "Ejecutar de todas formas". Es normal en
echo instaladores sin firma, no significa que haya ningun problema.
echo.
start "" explorer "release"
pause
exit /b 0
