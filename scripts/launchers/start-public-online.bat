@echo off
title Valencia PowerWatch - Live Online Deployment
cd /d "%~dp0..\.."
node scripts\launchers\start-online.js
pause
