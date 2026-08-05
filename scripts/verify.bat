@echo off
rem ============================================================
rem  verify.bat - Verify dist exe embeds work\newpack.rar.
rem ============================================================
setlocal
set ROOT=%~dp0..
where node >nul 2>nul
if %errorlevel%==0 (
  node "%~dp0verify.js" "%ROOT%\dist\QiXiuBaoInst_v2_win7.exe" "%ROOT%\work\newpack.rar"
  exit /b %errorlevel%
)
echo [ERROR] need node on PATH.
exit /b 1