@echo off
setlocal
cd /d "%~dp0"

set "PORTA=8000"
if not "%~1"=="" set "PORTA=%~1"

where py >nul 2>nul
if errorlevel 1 (set "PY=python") else (set "PY=py -3")

echo.
echo   Pasta servida : %CD%
echo   Endereco      : http://localhost:%PORTA%/
echo.
echo   Deixe esta janela aberta enquanto usar o site.
echo   Para parar o servidor, pressione Ctrl+C ou feche a janela.
echo.

start "" "http://localhost:%PORTA%/"
%PY% -m http.server %PORTA%

echo.
echo   O servidor foi encerrado.
echo   Se isso aconteceu logo de cara, verifique se o Python esta instalado
echo   ou tente outra porta, por exemplo:  servir.bat 8080
echo.
pause
