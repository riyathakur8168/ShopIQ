@echo off
title ShopIQ Backend
cd /d "%~dp0backend"
echo [ShopIQ] Activating Python environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo [ShopIQ] Starting Flask Backend on http://localhost:5000 ...
python app.py
pause

