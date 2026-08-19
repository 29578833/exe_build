@echo off
rem ============================================================
rem  verify.bat - Verify dist exe embeds the RAR payload.
rem  Usage: verify.bat [x64]
rem ============================================================
setlocal
set ROOT=%~dp0..

set ARCH=%~1
if /i "%ARCH%"=="x64" goto :x64
set EXE=%ROOT%\dist\QiXiuBaoInstV2_x32.exe
set NEWRAR=%ROOT%\work\newpack.rar
goto :done
:x64
set EXE=%ROOT%\dist\QiXiuBaoInstV2_x64.exe
set NEWRAR=%ROOT%\work\newpack_x64.rar
:done

where node >nul 2>nul
if %errorlevel%==0 (
  node "%~dp0verify.js" "%EXE%" "%NEWRAR%"
  exit /b %errorlevel%
)
echo [ERROR] need node on PATH.
exit /b 1
