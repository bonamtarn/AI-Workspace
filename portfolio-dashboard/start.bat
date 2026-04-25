@echo off
title Portfolio Dashboard
cd /d "%~dp0"

echo Starting TradingView API...
start "TradingView API" cmd /k "python tv_api.py"

timeout /t 3 /nobreak >nul

echo Starting Dashboard...
start "Dashboard" cmd /k "npm run dev"

echo Waiting for servers to be ready...
timeout /t 5 /nobreak >nul

echo Opening browser...
start http://localhost:5173

echo.
echo Done! If the page shows an error, wait a few seconds and refresh.
timeout /t 3 /nobreak >nul
