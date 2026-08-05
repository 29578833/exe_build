@echo off
rem ============================================================
rem  set_icon.bat - Wrapper for set_icon.js (replaces exe icon).
rem ============================================================
setlocal
where node >nul 2>nul
if %errorlevel%==0 (
  node "%~dp0set_icon.js"
  exit /b %errorlevel%
)
echo [ERROR] need node on PATH.
exit /b 1