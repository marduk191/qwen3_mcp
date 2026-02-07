@echo off
echo Starting MCP Chat Server...
echo.
echo Chat UI will be available at: http://localhost:3847/chat.html
echo Image Viewer at: http://localhost:3847/
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
node frontend/server.js
