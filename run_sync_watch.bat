@echo off
chcp 65001 >nul
title Watcher Continuo Salud - EntrenoApp
echo =========================================================================
echo    VIGILANTE AUTOMÁTICO DE ARCHIVOS Y DATOS (SUUNTO / ZEPP / BÁSCULA)
echo =========================================================================
echo Monitoreando carpeta data_inbox y base de datos ZeppBridge cada 5 minutos...
cd /d "%~dp0"
python sync_all_health_data.py --watch
pause
