# ShopIQ Full Stack Launcher
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "                ShopIQ - Full Stack App                 " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot


Write-Host "[1/2] Launching Backend Server on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; if (Test-Path 'venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; python app.py"

Start-Sleep -Seconds 2

Write-Host "[2/2] Launching Frontend Server on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; if (-not (Test-Path 'node_modules')) { npm install }; npm run dev"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Both servers have been launched in separate windows!   " -ForegroundColor Green
Write-Host " - Backend API:  http://localhost:5000/api              " -ForegroundColor White
Write-Host " - Frontend Web: http://localhost:5173                  " -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
