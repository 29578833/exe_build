@echo off
rem ============================================================
rem  build.bat - One-click build:
rem    assemble -> set_icon -> set_version -> pack -> patch
rem    -> set_installer_version -> verify
rem  Usage: build.bat [x64]
rem    (no arg) = 32-bit x86  -> dist\QiXiuBaoInstV2_x32.exe
rem    x64      = 64-bit      -> dist\QiXiuBaoInstV2_x64.exe
rem ============================================================
setlocal
set ROOT=%~dp0..

set ARCH=%~1
if /i "%ARCH%"=="x64" goto :x64
set OUT_NAME=QiXiuBaoInstV2_x32.exe
set ARCH=
goto :done
:x64
set OUT_NAME=QiXiuBaoInstV2_x64.exe
:done

call "%~dp0assemble.bat" %ARCH%
if errorlevel 1 ( echo [ERROR] assemble failed & exit /b 1 )
call "%~dp0set_icon.bat" %ARCH%
if errorlevel 1 ( echo [ERROR] set_icon failed & exit /b 1 )
call "%~dp0set_version_info.bat" main %ARCH%
if errorlevel 1 ( echo [ERROR] set main version info failed & exit /b 1 )
call "%~dp0pack_rar.bat" %ARCH%
if errorlevel 1 ( echo [ERROR] pack failed & exit /b 1 )
call "%~dp0patch.bat" %ARCH%
if errorlevel 1 ( echo [ERROR] patch failed & exit /b 1 )
call "%~dp0set_version_info.bat" installer %ARCH%
if errorlevel 1 ( echo [ERROR] set installer version info failed & exit /b 1 )
call "%~dp0verify.bat" %ARCH%
if errorlevel 1 ( echo [ERROR] verify failed & exit /b 1 )

echo.
echo [OK] BUILD SUCCESS: %ROOT%\dist\%OUT_NAME%
exit /b 0
