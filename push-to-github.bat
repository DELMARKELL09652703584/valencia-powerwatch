@echo off
title Valencia PowerWatch - Push to GitHub
cd /d "%~dp0"
echo ========================================================================
echo    UPLOADING VALENCIA POWERWATCH TO YOUR GITHUB REPOSITORY...
echo ========================================================================
echo.
echo  Kung mo-gawas ang "Sign in with your browser" popup, i-click lang ang Sign In!
echo.
git push -u origin main
echo.
echo ========================================================================
echo    DONE! Na-upload na sa imong GitHub!
echo ========================================================================
pause
