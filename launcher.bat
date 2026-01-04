@echo off
REM ========================================
REM Administrador de Propriedades - Main Launcher
REM ========================================

title Administrador de Propriedades - Launcher

:menu
cls
echo.
echo ========================================
echo   ADMINISTRADOR DE PROPRIEDADES - LAUNCHER
echo ========================================
echo.
echo  1. Instalar Dependências (Primeira vez)
echo  2. Iniciar Servidor (Produção)
echo  3. Iniciar Servidor (Desenvolvimento)
echo  4. Parar Servidor
echo  5. Abrir no Navegador
echo  6. Verificar Status
echo  0. Sair
echo.
echo ========================================
echo.

set /p choice="Escolha uma opção (0-6): "

if "%choice%"=="1" goto install
if "%choice%"=="2" goto start
if "%choice%"=="3" goto dev
if "%choice%"=="4" goto stop
if "%choice%"=="5" goto browser
if "%choice%"=="6" goto status
if "%choice%"=="0" goto end

echo.
echo [ERRO] Opção inválida!
timeout /t 2 >nul
goto menu

:install
cls
echo.
echo ========================================
echo  Instalando Dependências...
echo ========================================
echo.
call install.bat
echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto menu

:start
cls
echo.
echo ========================================
echo  Iniciando Servidor (Produção)
echo ========================================
echo.
echo [INFO] O servidor será aberto em uma nova janela
echo [INFO] Acesse: http://localhost:3000
echo.
start "Administrador de Propriedades - Server" cmd /k "cd /d %~dp0 && start.bat"
timeout /t 3 >nul
echo.
echo [SUCESSO] Servidor iniciado!
echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto menu

:dev
cls
echo.
echo ========================================
echo  Iniciando Servidor (Desenvolvimento)
echo ========================================
echo.
echo [INFO] O servidor será aberto em uma nova janela
echo [INFO] Acesse: http://localhost:3000
echo [INFO] Modo: Recarregamento automático ativado
echo.
start "Administrador de Propriedades - Dev Server" cmd /k "cd /d %~dp0 && dev.bat"
timeout /t 3 >nul
echo.
echo [SUCESSO] Servidor de desenvolvimento iniciado!
echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto menu

:stop
cls
echo.
echo ========================================
echo  Parando Servidor
echo ========================================
echo.
call stop.bat
echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto menu

:browser
cls
echo.
echo ========================================
echo  Abrindo Navegador
echo ========================================
echo.
call open-browser.bat
echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto menu

:status
cls
echo.
echo ========================================
echo  Verificando Status do Servidor
echo ========================================
echo.

REM Check if Node.js is running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Processos Node.js em execução:
    tasklist /FI "IMAGENAME eq node.exe"
    echo.
) else (
    echo [INFO] Nenhum processo Node.js em execução
    echo.
)

REM Check port 3000
netstat -ano | findstr :3000 >nul 2>nul
if "%ERRORLEVEL%"=="0" (
    echo [INFO] Porta 3000 em uso:
    netstat -ano | findstr :3000
    echo.
    echo [SUCESSO] Servidor provavelmente em execução
) else (
    echo [INFO] Porta 3000 livre
    echo [AVISO] Servidor não está rodando
)

echo.
echo ========================================
echo.
echo Pressione qualquer tecla para voltar ao menu...
pause >nul
goto menu

:end
cls
echo.
echo ========================================
echo  Encerrando Administrador de Propriedades
echo ========================================
echo.
echo Obrigado por usar o Administrador de Propriedades!
echo.
timeout /t 2 >nul
exit
