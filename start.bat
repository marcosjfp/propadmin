@echo off
REM ========================================
REM Administrador de Propriedades - Start Script
REM ========================================

echo.
echo ========================================
echo  Administrador de Propriedades
echo  Iniciando Ambiente Completo...
echo ========================================
echo.

REM 1. Carregar variáveis de ambiente de .env.local se existir
if exist .env.local (
    for /f "usebackq tokens=1,* delims==" %%a in (".env.local") do (
        if "%%a"=="DATABASE_URL" set DATABASE_URL=%%b
    )
)

REM 2. Encerrar processos antigos nas portas 3000 e 5173
echo [INFO] Limpando portas 3000 (Backend) e 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

REM 3. Iniciar Backend
echo [INFO] Iniciando Backend: http://localhost:3000
start "Backend Server" cmd /k "pnpm run dev"

REM 4. Aguardar um pouco e iniciar Frontend
echo [INFO] Iniciando Frontend: http://localhost:5173
timeout /t 5 /nobreak >nul
start "Frontend Server" cmd /k "pnpm run client-dev"

echo.
echo ========================================
echo  SERVIDORES INICIADOS!
echo ========================================
echo  Pressione qualquer tecla para sair desta janela.
echo  Mantenha as outras janelas abertas para o sistema funcionar.
echo ========================================
echo.
pause

