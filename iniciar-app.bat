@echo off
title Portaria Clarity Glass
cd /d "%~dp0"

set "EXE_X64=%~dp0electron-x64\electron.exe"
set "EXE_IA32=%~dp0electron-ia32\electron.exe"

set "HAS_X64=0"
set "HAS_IA32=0"
if exist "%EXE_X64%" set "HAS_X64=1"
if exist "%EXE_IA32%" set "HAS_IA32=1"

if not "%HAS_X64%"=="1" if not "%HAS_IA32%"=="1" (
  echo.
  echo [ERRO] Nenhuma versao do Electron foi encontrada.
  echo Para instalar, execute:  instalar.bat
  echo.
  pause
  exit /b 1
)

:menu
cls
echo ==============================================
echo   PORTARIA CLARITY GLASS - INICIAR
echo ==============================================
echo.
if "%HAS_X64%"=="1" echo   [1] Versao 64-bit
if "%HAS_IA32%"=="1" echo   [2] Versao 32-bit
echo   [3] Sair
echo.
set /p escolha=Escolha uma opcao (1-3): 

if "%escolha%"=="1" goto run64
if "%escolha%"=="2" goto run32
if "%escolha%"=="3" goto sair
echo Opcao invalida! Tente novamente.
timeout /t 2 >nul
goto menu

:run64
if not exist "%EXE_X64%" (
  echo Versao 64-bit nao encontrada.
  timeout /t 2 >nul
  goto menu
)
start "" "%EXE_X64%" .
goto fim

:run32
if not exist "%EXE_IA32%" (
  echo Versao 32-bit nao encontrada.
  timeout /t 2 >nul
  goto menu
)
start "" "%EXE_IA32%" .
goto fim

:sair
exit /b 0

:fim
exit /b 0
