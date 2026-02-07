@echo off
echo Stopping MCP Chat Server...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3847" ^| findstr "LISTENING"') do (
    echo Killing process %%a
    taskkill /F /PID %%a 2>nul
)
echo Server stopped.
pause
