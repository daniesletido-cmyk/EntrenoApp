@echo off
setlocal enabledelayedexpansion
title EntrenoApp - Subir a GitHub
cd /d "%~dp0"

set PATH=C:\Program Files\Git\cmd;C:\Program Files\Git\bin;%PATH%

echo ============================================================
echo         ENTRENOAPP - SUBIENDO A TU REPOSITORIO GITHUB
echo ============================================================
echo.
echo Repositorio: https://github.com/daniesletido-cmyk/EntrenoApp.git
echo.

git branch -M main
git push -u origin main

if errorlevel 1 (
  echo.
  echo ============================================================
  echo AVISO DE AUTORIZACION DE GITHUB:
  echo ============================================================
  echo Si se abre una ventana en tu navegador pidiendo autorizar
  echo GitHub para Windows, pulsa el boton verde "Authorize".
  echo Despues, vuelve a ejecutar este archivo para completar la subida.
) else (
  echo.
  echo ============================================================
  echo       [OK] PROYECTO SUBIDO CON EXITO A GITHUB
  echo ============================================================
  echo.
  echo Ya puedes entrar en:
  echo https://github.com/daniesletido-cmyk/EntrenoApp/actions
  echo.
  echo Y veras aparecer inmediatamente "Compilar Apps Moviles (Android e iOS)".
)

pause
