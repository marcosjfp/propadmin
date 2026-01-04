@echo off
REM ========================================
REM Deploy para Railway
REM ========================================

echo.
echo ========================================
echo  Deploy para Railway
echo ========================================
echo.

REM Verificar se Railway CLI está instalado
where railway >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Instalando Railway CLI...
    npm install -g @railway/cli
)

echo [INFO] Fazendo login no Railway...
railway login

echo.
echo [INFO] Linkando projeto...
railway link

echo.
echo [INFO] Iniciando deploy...
railway up

echo.
echo ========================================
echo  Deploy concluído!
echo ========================================
echo.
pause
