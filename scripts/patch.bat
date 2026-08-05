@echo off
rem ============================================================
rem  patch.bat - Embed work\newpack.rar into the NSIS shell.
rem  Uses Node (patch_installer.js) or Python (patch_installer.py).
rem ============================================================
setlocal
set ROOT=%~dp0..
set SRC=%ROOT%\resources\installer\original_installer.exe
set NEWRAR=%ROOT%\work\newpack.rar
set OUT=%ROOT%\dist\QiXiuBaoInst_v2_win7.exe

where node >nul 2>nul
if %errorlevel%==0 (
  node "%~dp0patch_installer.js" "%SRC%" "%NEWRAR%" "%OUT%"
  exit /b %errorlevel%
)
where python >nul 2>nul
if %errorlevel%==0 (
  python "%~dp0patch_installer.py" "%SRC%" "%NEWRAR%" "%OUT%"
  exit /b %errorlevel%
)
echo [ERROR] need node or python on PATH.
exit /b 1