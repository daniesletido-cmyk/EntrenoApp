@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Generar APK Android
cd /d "%~dp0"

echo ============================================================
echo         ENTRENOAPP - GENERADOR DE APK PARA ANDROID
echo ============================================================
echo.

rem 1. Comprobar Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No se encuentra Node.js instalado.
  pause
  exit /b 1
)

rem 2. Compilar frontend estatico de Next.js
echo [1/3] Compilando frontend optimizado para movil...
call node scripts/build-mobile.mjs
if errorlevel 1 (
  echo [ERROR] Fallo al compilar el frontend movil.
  pause
  exit /b 1
)

rem 3. Sincronizar con el proyecto nativo de Android
echo.
echo [2/3] Sincronizando con el proyecto nativo de Android...
call npx cap sync android
if errorlevel 1 (
  echo [ERROR] Fallo al sincronizar Capacitor con Android.
  pause
  exit /b 1
)

rem 4. Intentar compilar el APK con Gradle si el SDK esta presente
echo.
echo [3/3] Comprobando entorno de Android SDK y Gradle...

rem Comprobar si existe Android SDK tipico
set ANDROID_SDK_DIR=%LOCALAPPDATA%\Android\Sdk
if exist "!ANDROID_SDK_DIR!" (
  if not exist "android\local.properties" (
    echo sdk.dir=!ANDROID_SDK_DIR:\=\\! > android\local.properties
  )
)

if exist "android\gradlew.bat" (
  cd android
  call gradlew.bat assembleDebug
  if not errorlevel 1 (
    echo.
    echo ============================================================
    echo       [OK] APK COMPILADO CON EXITO
    echo ============================================================
    echo.
    echo Archivo generado:
    echo android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    cd ..
    pause
    exit /b 0
  )
  cd ..
)

echo.
echo ============================================================
echo   PROYECTO ANDROID LISTO EN 'android/'
echo ============================================================
echo.
echo Para generar el archivo final .apk:
echo   1. Si tienes Android Studio instalado, pulsa S para abrirlo:
echo      (Dentro de Android Studio: Build ^> Build Bundle/APK ^> Build APK)
echo   2. O compila desde la terminal con: cd android ^& gradlew assembleDebug
echo.
set /p OPEN_AS="Deseas abrir el proyecto en Android Studio ahora? (S/N): "
if /i "!OPEN_AS!"=="S" (
  call npx cap open android
)

pause
