@echo off
chcp 65001 >nul
title Sincronizador de Salud y Rendimiento - EntrenoApp
echo =========================================================================
echo    SINCRONIZANDO DATOS DE SALUD, SUUNTO, ZEPP Y BÁSCULA CON ENTRENOAPP
echo =========================================================================
cd /d "%~dp0"
python sync_all_health_data.py
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
