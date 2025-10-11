@echo off
echo Starting Ethos Auto-Updater...
echo This will update profiles and weekly XP data every 3 hours.
echo Press Ctrl+C to stop.
echo.

cd /d "%~dp0.."
node scripts/auto-updater.js

pause
