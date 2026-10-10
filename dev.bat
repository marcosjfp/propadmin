@echo off
cd /d "%~dp0"
set NODE_ENV=development
rem Start the frontend in another terminal with pnpm client-dev.
call pnpm dev
