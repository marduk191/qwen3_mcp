@echo off
echo Restarting MCP Chat Server...
echo.

:: Kill existing server
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3847" ^| findstr "LISTENING"') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Starting server...
echo.
echo Chat UI: http://localhost:3847/chat.html
echo Image Viewer: http://localhost:3847/
echo.
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
node frontend/server.js
