@echo off
rem ============================================================
rem  set_icon.bat - Wrapper for set_icon.js (replaces exe icon).
rem  Usage: set_icon.bat [x64]  (default: 32-bit work\build)
rem ============================================================
setlocal
set ARCH=%~1
if /i "%ARCH%"=="x64" (
  set BUILD_DIR=build_x64
) else (
  set BUILD_DIR=build
)
where node >nul 2>nul
if %errorlevel%==0 (
  node "%~dp0set_icon.js" %BUILD_DIR%
  exit /b %errorlevel%
)
echo [ERROR] need node on PATH.
exit /b 1
