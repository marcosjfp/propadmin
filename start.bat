@echo off
cd /d "%~dp0"
set NODE_ENV=production
if not exist dist\index.html (
  echo Build first: pnpm build
  exit /b 1
)
call pnpm start
