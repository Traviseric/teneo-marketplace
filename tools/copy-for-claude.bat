@echo off
echo.
echo ====================================
echo  Copying Files for Claude Import
echo ====================================
echo.

REM Change to the project root directory
cd /d "%~dp0\.."

REM Run the Node.js script
echo Running copy script...
echo.
node tools\copy-for-claude.js

REM Check if the script ran successfully
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to run the copy script!
    echo Make sure Node.js is installed and in your PATH.
    pause
    exit /b 1
)

REM Check if claude-files directory exists
if not exist "claude-files" (
    echo.
    echo [ERROR] claude-files directory was not created!
    pause
    exit /b 1
)

echo.
echo ====================================
echo  Opening claude-files folder...
echo ====================================
echo.

REM Open the claude-files directory in Windows Explorer
start "" "%cd%\claude-files"

echo The claude-files folder has been opened in Windows Explorer.
echo.
echo To import into Claude:
echo   1. Select all files in the folder (Ctrl+A)
echo   2. Drag and drop them into Claude's interface
echo   3. Or use Claude's "Add files" button
echo.
echo Press any key to exit...
pause > nul