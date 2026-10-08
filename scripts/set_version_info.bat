@echo off
rem ============================================================
rem  set_version_info.bat - Write QXB Windows version resources.
rem  Usage: set_version_info.bat main [x64]
rem         set_version_info.bat installer [x64]
rem ============================================================
setlocal
set ROOT=%~dp0..
set MODE=%~1
set ARCH=%~2

where node >nul 2>nul
if not %errorlevel%==0 (
  echo [ERROR] need node on PATH.
  exit /b 1
)

if /i "%MODE%"=="main" goto :main
if /i "%MODE%"=="installer" goto :installer
echo [ERROR] mode must be main or installer.
exit /b 1

:main
if /i "%ARCH%"=="x64" (
  set TARGET=%ROOT%\work\build_x64\汽修宝电脑版.exe
) else (
  set TARGET=%ROOT%\work\build\汽修宝电脑版.exe
)
node "%~dp0set_version_info.js" "%TARGET%" app
exit /b %errorlevel%

:installer
if /i "%ARCH%"=="x64" (
  set TARGET=%ROOT%\dist\QiXiuBaoInstV2_x64.exe
) else (
  set TARGET=%ROOT%\dist\QiXiuBaoInstV2_x32.exe
)
node "%~dp0set_version_info.js" "%TARGET%" installer
exit /b %errorlevel%
