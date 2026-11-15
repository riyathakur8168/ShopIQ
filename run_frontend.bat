@echo off
title ShopIQ Frontend
cd /d "%~dp0frontend"
if not exist "node_modules\" (
    echo [ShopIQ] Installing frontend dependencies (npm install)...
    call npm install
)

echo [ShopIQ] Starting Vite Dev Server on http://localhost:5173 ...
call npm run dev
pause
