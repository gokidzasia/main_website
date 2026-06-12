@echo off
cd /d "%~dp0"
set PORT=5600
node admin-server.js
pause
