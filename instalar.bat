@echo off
title Portaria Clarity Glass - Instalacao
echo ============================================
echo   Portaria Clarity Glass - Instalacao
echo ============================================
echo.
echo Instalando o Electron (pode demorar alguns minutos)...
echo.
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERRO] Falha ao instalar. Verifique se o Node.js esta instalado.
  pause
  exit /b 1
)
echo.
echo Instalacao concluida com sucesso!
echo.
echo Para abrir o sistema, execute:  iniciar-app.bat
echo.
pause
