@echo off
rem ============================================================
rem  assemble.bat - Assemble work\build from src + resources.
rem  Copies shell source into the NW.js runtime dir, renames the
rem  main exe (via Node), removes junk files. Idempotent.
rem ============================================================
setlocal
set ROOT=%~dp0..
set BUILD=%ROOT%\work\build
set SRC=%ROOT%\src
set RES=%ROOT%\resources\installer

if not exist "%BUILD%\nw.dll" (
  echo [ERROR] work\build missing NW.js runtime - nw.dll not found.
  echo         Download NW.js 0.72.0 win-ia32 and extract into work\build:
  echo         curl -L -o "%ROOT%\work\nwjs.zip" https://dl.node-webkit.org/v0.72.0/nwjs-v0.72.0-win-ia32.zip
  exit /b 1
)

rem 1) shell source (package.json + app\)
copy /y "%SRC%\package.json" "%BUILD%\package.json" >nul
if not exist "%BUILD%\app" mkdir "%BUILD%\app"
xcopy /y /e /i /q "%SRC%\app\*" "%BUILD%\app\" >nul

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

echo [OK] assemble done.
exit /b 0
