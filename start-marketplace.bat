@echo off
echo =========================================
echo Starting Teneo Marketplace
echo =========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting backend server on port 3001...
cd marketplace\backend

:: Check if node_modules exists, if not run npm install
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
    echo.
)

:: Start the backend server in a new window
start "Teneo Backend Server" cmd /k "npm start"

:: Give the server a moment to start
timeout /t 3 /nobreak >nul

:: Open the frontend in the default browser
echo Opening Teneo Marketplace in your browser...
start http://localhost:3001

echo.
echo =========================================
echo Teneo Marketplace is running!
echo =========================================
echo Backend API: http://localhost:3001/api
echo Frontend:    http://localhost:3001
echo.
echo Press Ctrl+C in the server window to stop the server
echo.
pause