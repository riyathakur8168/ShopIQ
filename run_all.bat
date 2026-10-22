@echo off
title ShopIQ Launcher
echo ========================================================
echo                 ShopIQ - Full Stack App
echo ========================================================
echo.
echo [1/2] Launching Backend Server (Flask on port 5000)...
start "ShopIQ Backend" "%~dp0run_backend.bat"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Frontend Server (Vite on port 5173)...
start "ShopIQ Frontend" "%~dp0run_frontend.bat"

echo.
echo ========================================================
echo  Both servers have been launched in separate windows!
echo  - Backend API:  http://localhost:5000/api
echo  - Frontend Web: http://localhost:5173
echo ========================================================
echo.
timeout /t 5
