@echo off
REM ========================================
REM Administrador de Propriedades - Stop Servers
REM ========================================

echo.
echo ========================================
echo  Administrador de Propriedades - Parando Servidores
echo ========================================
echo.

REM Kill any existing Node processes on port 3000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo [INFO] Encerrando backend na porta 3000 PID: %%a
    taskkill /F /PID %%a >nul 2>nul
)

REM Kill any existing Node processes on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    echo [INFO] Encerrando frontend na porta 5173 PID: %%a
    taskkill /F /PID %%a >nul 2>nul
)

echo [INFO] Servidores parados.
echo.
pause

