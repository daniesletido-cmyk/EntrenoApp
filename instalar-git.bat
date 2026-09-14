@echo off
title Instalar Git en Windows
cd /d "%~dp0"

echo ============================================================
echo            INSTALACION AUTOMATICA DE GIT
echo ============================================================
echo.
echo Si te aparece una ventana de Windows pidiendo permisos de
echo administrador, pulsa "Si" para continuar.
echo.

winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements

echo.
echo ============================================================
echo   [OK] INSTALACION FINALIZADA
echo ============================================================
echo.
echo Ya puedes ejecutar 'subir-a-github.bat'.
pause
