@echo off
REM ========================================
REM Administrador de Propriedades - Production Start
REM ========================================

echo.
echo ========================================
echo  Administrador de Propriedades - Modo de Produção
echo  Iniciando Servidor...
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [ERRO] Dependências não instaladas. Por favor, execute a opção 1 do launcher.
    pause
    exit /b 1
)

REM Kill any existing Node processes on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

echo [INFO] Backend: http://localhost:3000
echo [INFO] Frontend: http://localhost:5173
echo ========================================
echo  Pressione Ctrl+C para parar os servidores
echo ========================================
echo.

REM Set database URL environment variable
set DATABASE_URL=mysql://root:rootpass123@localhost:3307/administrador_de_propriedades

REM Start backend server in a new window
start "Backend Server" cmd /k "set DATABASE_URL=mysql://root:rootpass123@localhost:3307/administrador_de_propriedades && pnpm exec tsx server/_core/index.ts"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend server in a new window
start "Frontend Server" cmd /k "pnpm --dir client dev"

echo.
echo [INFO] Servidores iniciados em janelas separadas
echo [INFO] Feche as janelas para parar os servidores
echo.
pause

