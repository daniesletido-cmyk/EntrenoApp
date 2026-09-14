@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Subir a GitHub
cd /d "%~dp0"

echo ============================================================
echo         ENTRENOAPP - SUBIR CODIGO A GITHUB
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git aun no esta disponible en el sistema.
  echo Por favor, ejecuta primero el archivo 'instalar-git.bat'
  echo que tienes en esta misma carpeta.
  echo.
  pause
  exit /b 1
)

echo [1/3] Preparando repositorio local...
if not exist ".git" (
  call git init -b main
)

call git add .
call git commit -m "Soporte movil Android e iOS con Capacitor" >nul 2>&1

echo.
echo ============================================================
echo [2/3] VINCULAR CON TU CUENTA DE GITHUB
echo ============================================================
echo.
echo 1. Entra en tu navegador a: https://github.com/new
echo 2. En "Repository name" escribe: EntrenoApp
echo 3. Puedes marcarlo "Private" (Privado) o "Public" (Publico)
echo 4. Pulsa el boton verde "Create repository"
echo 5. Copia la direccion que empieza por https://github.com/...
echo.
set /p REPO_URL="Pega aqui el enlace de tu repositorio de GitHub: "

if "!REPO_URL!"=="" (
  echo No has pegado ningun enlace. Operacion cancelada.
  pause
  exit /b 1
)

echo.
echo [3/3] Subiendo proyecto a GitHub...
call git remote remove origin >nul 2>&1
call git remote add origin !REPO_URL!
call git branch -M main >nul 2>&1
call git push -u origin main

if errorlevel 1 (
  echo.
  echo [AVISO] Si es la primera vez que subes a GitHub desde tu PC,
  echo se abrira una ventana en el navegador para dar permiso a GitHub.
  echo Vuelve a intentarlo tras iniciar sesion.
) else (
  echo.
  echo ============================================================
  echo   [OK] PROYECTO SUBIDO CON EXITO A GITHUB
  echo ============================================================
  echo.
  echo Ahora en tu repositorio web de GitHub:
  echo 1. Entra a la pestana 'Actions'
  echo 2. Selecciona 'Compilar Apps Moviles (Android e iOS)'
  echo 3. Pulsa 'Run workflow'
  echo 4. En unos minutos podras descargar tu archivo .ipa de iOS.
)

pause
