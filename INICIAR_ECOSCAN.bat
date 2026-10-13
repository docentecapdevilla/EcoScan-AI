@echo off
setlocal
cd /d "%~dp0"
title EcoScan AI - 4 modelos
echo =========================================
echo EcoScan AI - Laboratorio de residuos
echo =========================================
where python >nul 2>nul
if errorlevel 1 (
 echo ERROR: No se encontro Python. Instala Python 3.11 o 3.12 y marca Add to PATH.
 pause
 exit /b 1
)
python -c "import torch, torchvision, ultralytics, PIL" >nul 2>nul
if errorlevel 1 (
 echo.
 echo Faltan dependencias. Instalando (puede tardar varios minutos)...
 python -m pip install -r requirements.txt
 if errorlevel 1 (
   echo ERROR instalando dependencias. Revisa tu conexion.
   pause
   exit /b 1
 )
)
echo.
echo Abre http://127.0.0.1:8765 en Chrome
echo Para detener: Ctrl+C
echo.
python server.py
pause
