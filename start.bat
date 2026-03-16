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

REM 1. Certificar-se de que o Banco de Dados (Docker) está rodando
echo [INFO] Verificando Banco de Dados...
docker start mysql-admin-propriedades >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [AVISO] Nao foi possivel iniciar o container 'mysql-admin-propriedades'.
    echo Certifique-se de que o Docker Desktop esta aberto e rodando.
) else (
    echo [SUCCESS] Banco de Dados MySQL Docker pronto.
)

REM 2. Encerrar processos antigos nas portas 3000 e 5173
echo [INFO] Limpando portas 3000 (Backend) e 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>nul
)

REM 3. Configurar ambiente e iniciar Backend
echo [INFO] Iniciando Backend: http://localhost:3000
set DATABASE_URL=mysql://root:rootpass123@localhost:3307/administrador_de_propriedades
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

