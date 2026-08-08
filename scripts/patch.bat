@echo off
rem ============================================================
rem  patch.bat - Embed RAR payload into the NSIS shell.
rem  Usage: patch.bat [x64]
rem    x86 -> work\newpack.rar      -> dist\QiXiuBaoInst_v2_win7.exe
rem    x64 -> work\newpack_x64.rar  -> dist\QiXiuBaoInst_v2.2_x64.exe
rem ============================================================
setlocal
set ROOT=%~dp0..
set SRC=%ROOT%\resources\installer\original_installer.exe

set ARCH=%~1
if /i "%ARCH%"=="x64" goto :x64
set NEWRAR=%ROOT%\work\newpack.rar
set OUT=%ROOT%\dist\QiXiuBaoInst_v2_win7.exe
goto :done
:x64
set NEWRAR=%ROOT%\work\newpack_x64.rar
set OUT=%ROOT%\dist\QiXiuBaoInst_v2.2_x64.exe
:done

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
