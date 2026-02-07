@echo off
echo ============================================
echo   Qwen3 MCP Server - Setup
echo ============================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found

:: Install npm dependencies
echo.
echo Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [OK] Dependencies installed

:: Create skills directory
if not exist "skills" mkdir skills
echo [OK] Skills directory ready

:: Create memory directory
if not exist "%USERPROFILE%\.lmstudio-mcp-memory" mkdir "%USERPROFILE%\.lmstudio-mcp-memory"
echo [OK] Memory directory ready

:: Setup MCP config for LM Studio
echo.
echo Setting up LM Studio MCP configuration...
powershell -ExecutionPolicy Bypass -File "%~dp0setup-mcp.ps1"

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo To start the HTTP server (browser chat):
echo   start-chat.bat
echo   Then open http://localhost:3847/chat.html
echo.
echo For LM Studio MCP mode:
echo   Restart LM Studio - the MCP server should appear
echo.
pause
