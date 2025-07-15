@echo off
echo Creating flat file structure for Claude...
node tools\copy-flat-for-claude.js
echo.
echo Opening folder...
explorer claude-files-flat
echo.
echo Instructions:
echo 1. Select all files (Ctrl+A)
echo 2. Drag to Claude project files
echo 3. Delete old files in Claude first if updating
echo.
pause