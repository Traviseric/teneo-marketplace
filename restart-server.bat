@echo off
echo Stopping existing node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Teneo Marketplace server...
cd /d "%~dp0"
start cmd /k "npm start"

echo.
echo Server is starting. Please wait a few seconds...
timeout /t 5 /nobreak >nul

echo.
echo Testing server health...
curl http://localhost:3001/api/health

echo.
echo.
echo Server restarted successfully!
echo You can now run: node test-purchase-flow.js
echo.