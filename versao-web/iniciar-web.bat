@echo off
title Portaria Clarity Glass - Versao Web
cd /d "%~dp0"

echo ==============================================
echo   PORTARIA CLARITY GLASS - VERSAO WEB
echo ==============================================
echo.
echo  O sistema abrira no seu navegador padrao
echo  (nao usa o Electron, nao precisa instalar nada).
echo.
echo  Para usar o "Finalizar Turno" e gerar o PDF,
echo  abra o index.html e clique no botao.
echo.
echo  Dica: se a pagina abrir em branco, atualize
echo  com F5 ou Ctrl+F5.
echo.
pause

start "" "index.html"
exit /b 0
