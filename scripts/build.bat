@echo off
rem ============================================================
rem  build.bat - One-click build: assemble -^> pack -^> patch -^> verify
rem  Output: dist\QiXiuBaoInst_v2_win7.exe
rem ============================================================
setlocal
set ROOT=%~dp0..

call "%~dp0assemble.bat"
if errorlevel 1 ( echo [ERROR] assemble failed & exit /b 1 )
call "%~dp0pack_rar.bat"
if errorlevel 1 ( echo [ERROR] pack failed & exit /b 1 )
call "%~dp0patch.bat"
if errorlevel 1 ( echo [ERROR] patch failed & exit /b 1 )
call "%~dp0verify.bat"
if errorlevel 1 ( echo [ERROR] verify failed & exit /b 1 )

echo.
echo [OK] BUILD SUCCESS: %ROOT%\dist\QiXiuBaoInst_v2_win7.exe
exit /b 0