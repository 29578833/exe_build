@echo off
rem ============================================================
rem  assemble.bat - Assemble work\build (x86) or work\build_x64.
rem  Usage: assemble.bat [x64]
rem  Copies shell source into the NW.js runtime dir, renames the
rem  main exe (via Node), removes junk files. Idempotent.
rem ============================================================
setlocal
set ROOT=%~dp0..
set SRC=%ROOT%\src
set RES=%ROOT%\resources\installer

set ARCH=%~1
if /i "%ARCH%"=="x64" goto :x64
set BUILD=%ROOT%\work\build
set VER_OVERRIDE=
goto :done
:x64
set BUILD=%ROOT%\work\build_x64
set VER_OVERRIDE=2.2.0
:done

if not exist "%BUILD%\nw.dll" (
  echo [ERROR] %BUILD% missing NW.js runtime - nw.dll not found.
  echo         x86: curl -L -o "%ROOT%\work\nwjs.zip" https://dl.node-webkit.org/v0.72.0/nwjs-v0.72.0-win-ia32.zip
  echo         x64: curl -L -o "%ROOT%\work\nwjs.zip" https://dl.node-webkit.org/v0.72.0/nwjs-v0.72.0-win-x64.zip
  exit /b 1
)

rem 1) shell source (package.json + app\)
copy /y "%SRC%\package.json" "%BUILD%\package.json" >nul
if not exist "%BUILD%\app" mkdir "%BUILD%\app"
xcopy /y /e /i /q "%SRC%\app\*" "%BUILD%\app\" >nul

rem 1b) x64 line uses its own version number (v2.2.x)
if not "%VER_OVERRIDE%"=="" (
  where node >nul 2>nul
  if %errorlevel%==0 node "%~dp0set_pkg_version.js" "%BUILD%\package.json" %VER_OVERRIDE%
)

rem 2) original uninstaller files (go into the RAR payload)
copy /y "%RES%\unins000.dat" "%BUILD%\unins000.dat" >nul
copy /y "%RES%\unins000.exe" "%BUILD%\unins000.exe" >nul

rem 3) rename nw.exe -> QixiuBao main exe (needs Node)
where node >nul 2>nul
if %errorlevel%==0 node "%~dp0rename_main_exe.js" "%BUILD%"
if exist "%BUILD%\nw.exe" (
  echo [ERROR] could not rename nw.exe - Node missing?
  exit /b 1
)

rem 4) cleanup junk / obsolete files
for %%F in (chromedriver.exe dbghelp.dll libexif.dll natives_blob.bin snapshot_blob.bin .DS_Store) do (
  if exist "%BUILD%\%%F" del /q "%BUILD%\%%F"
)
if exist "%BUILD%\app\.DS_Store" del /q "%BUILD%\app\.DS_Store"
if exist "%BUILD%\app\icon\.DS_Store" del /q "%BUILD%\app\icon\.DS_Store"

echo [OK] assemble done: %BUILD%
exit /b 0
