@echo off
title Valencia PowerWatch Server
echo ===================================================
echo   Valencia PowerWatch - Outage Information System
echo   Running at http://localhost:4000
echo   Admin Portal:     http://localhost:4000/admin
echo   Community Portal: http://localhost:4000/community
echo ===================================================
echo Press Ctrl+C in this window to stop the server.
echo.
node server/index.js
pause
