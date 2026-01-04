@echo off
REM ========================================
REM Administrador de Propriedades - Development Mode
REM With Auto-Restart on File Changes
REM ========================================

echo.
echo ========================================
echo  Administrador de Propriedades - Modo de Desenvolvimento
echo  Iniciando com Recarregamento Automático...
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Node.js não está instalado ou não está no PATH
    echo Por favor, instale o Node.js em https://nodejs.org/
    pause
    exit /b 1
)

REM Check if pnpm is installed
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] pnpm não está instalado
    echo Instalando pnpm globalmente...
    npm install -g pnpm
)

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Dependências não encontradas. Instalando...
    pnpm install
    if %ERRORLEVEL% neq 0 (
        echo [ERRO] Falha ao instalar dependências
        pause
        exit /b 1
    )
)

REM Encerrar quaisquer processos Node existentes na porta 3000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

timeout /t 2 /nobreak >nul

echo.
echo [INFO] Iniciando em modo de desenvolvimento com observação...
echo [INFO] Backend: http://localhost:3000
echo [INFO] Frontend: http://localhost:5173
echo [INFO] Os arquivos serão observados para alterações
echo.
echo ========================================
echo  Pressione Ctrl+C para parar os servidores
echo ========================================
echo.

REM Set database URL environment variable
set DATABASE_URL=mysql://root:rootpass123@localhost:3307/administrador_de_propriedades

REM Start backend server in a new window
start "Backend Server" cmd /k "set DATABASE_URL=mysql://root:rootpass123@localhost:3307/administrador_de_propriedades && pnpm exec tsx watch server/_core/index.ts"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend server in a new window
start "Frontend Server" cmd /k "pnpm --dir client dev"

echo.
echo [INFO] Servidores iniciados em janelas separadas
echo [INFO] Feche as janelas para parar os servidores
echo.
pause
