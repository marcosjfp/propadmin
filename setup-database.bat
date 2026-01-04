@echo off
REM ========================================
REM MySQL Database Setup Script
REM ========================================

echo.
echo ========================================
echo  Setting up MySQL Database for
echo  Administrador de Propriedades
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo [INFO] Docker is running...
echo.

REM Check if container already exists
docker ps -a | findstr mysql-admin-propriedades >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] MySQL container already exists. Starting it...
    docker start mysql-admin-propriedades
    echo [SUCCESS] MySQL container started!
) else (
    echo [INFO] Creating MySQL container...
    docker run --name mysql-admin-propriedades ^
        -e MYSQL_ROOT_PASSWORD=root ^
        -e MYSQL_DATABASE=administrador_de_propriedades ^
        -p 3306:3306 ^
        -d mysql:8.0
    
    if %ERRORLEVEL% equ 0 (
        echo [SUCCESS] MySQL container created and started!
        echo.
        echo [INFO] Waiting for MySQL to be ready (10 seconds)...
        timeout /t 10 /nobreak >nul
    ) else (
        echo [ERROR] Failed to create MySQL container!
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Pushing database schema...
call pnpm db:push

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================
    echo  DATABASE SETUP COMPLETE!
    echo ========================================
    echo.
    echo  Connection Details:
    echo  - Host: localhost
    echo  - Port: 3306
    echo  - Database: administrador_de_propriedades
    echo  - User: root
    echo  - Password: root
    echo.
    echo  You can now restart the server!
    echo ========================================
) else (
    echo.
    echo [WARNING] Schema push failed. You may need to run:
    echo   pnpm db:push
    echo manually after MySQL is fully ready.
)

echo.
pause
