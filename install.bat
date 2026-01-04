@echo off
REM ========================================
REM Administrador de Propriedades - Install Script
REM ========================================

echo.
echo ========================================
echo  Administrador de Propriedades - Instalação
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js não está instalado ou não está no PATH
    echo.
    echo Por favor, instale o Node.js em https://nodejs.org/
    echo Versão recomendada: 18.x ou superior
    echo.
    pause
    exit /b 1
)

echo [SUCESSO] Node.js encontrado
node --version

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo.
    echo [INFO] pnpm não encontrado. Instalando pnpm globalmente...
    npm install -g pnpm
    if %ERRORLEVEL% neq 0 (
        echo [ERRO] Falha ao instalar pnpm
        pause
        exit /b 1
    )
)

echo [SUCESSO] pnpm encontrado
pnpm --version

REM Clean install
echo.
echo [INFO] Instalando dependências...
echo Isso pode levar alguns minutos...
echo.

pnpm install

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependências
    echo Por favor, verifique sua conexão com a internet e tente novamente
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Instalação Concluída!
echo ========================================
echo.
echo Próximos passos:
echo   1. Execute 'start.bat' para iniciar o servidor
echo   2. Abra http://localhost:3000 no seu navegador
echo   3. Clique em "Entrar na Plataforma" para fazer login
echo.
echo Para desenvolvimento com recarregamento automático, use 'dev.bat'
echo Para parar o servidor, use 'stop.bat' ou pressione Ctrl+C
echo.
pause
