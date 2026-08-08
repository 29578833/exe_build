@echo off
rem ============================================================
rem  pack_rar.bat - Build RAR payload from the build dir.
rem  Usage: pack_rar.bat [x64]
rem    x86 -> work\build      -> work\newpack.rar
rem    x64 -> work\build_x64  -> work\newpack_x64.rar
rem  MUST keep the original compression level (RAR3 m3 -ep1) or
rem  the NSIS built-in extractor drops the trailing files.
rem  Small files first, nw.dll last.
rem ============================================================
setlocal
set ROOT=%~dp0..
set RAR=%ROOT%\tools\Rar.exe

set ARCH=%~1
if /i "%ARCH%"=="x64" goto :x64
set BUILD=%ROOT%\work\build
set OUT=%ROOT%\work\newpack.rar
goto :done
:x64
set BUILD=%ROOT%\work\build_x64
set OUT=%ROOT%\work\newpack_x64.rar
:done

if not exist "%RAR%" ( echo [ERROR] missing tools\Rar.exe & exit /b 1 )
if not exist "%BUILD%\nw.dll" ( echo [ERROR] run assemble.bat first & exit /b 1 )

if exist "%OUT%" del /q "%OUT%"

rem --- pass 1: small files, fixed order ---
"%RAR%" a -ma3 -m3 -ep1 -x*.pak.info "%OUT%" ^
  "%BUILD%\nw_100_percent.pak" "%BUILD%\nw_200_percent.pak" "%BUILD%\nw_elf.dll" ^
  "%BUILD%\package.json" "%BUILD%\resources.pak" "%BUILD%\v8_context_snapshot.bin" ^
  "%BUILD%\unins000.dat" "%BUILD%\unins000.exe" "%BUILD%\credits.html" ^
  "%BUILD%\d3dcompiler_47.dll" "%BUILD%\ffmpeg.dll" "%BUILD%\icudtl.dat" ^
  "%BUILD%\libEGL.dll" "%BUILD%\libGLESv2.dll" "%BUILD%\node.dll" ^
  "%BUILD%\notification_helper.exe" "%BUILD%\vk_swiftshader.dll" ^
  "%BUILD%\vk_swiftshader_icd.json" "%BUILD%\vulkan-1.dll"
if errorlevel 1 ( echo [ERROR] rar pass 1 failed & exit /b 1 )

rem --- pass 2: exe files ---
"%RAR%" a -ma3 -m3 -ep1 -x*.pak.info "%OUT%" "%BUILD%\*.exe"
if errorlevel 1 ( echo [ERROR] rar pass 2 failed & exit /b 1 )

rem --- pass 3-5: recursive dirs ---
"%RAR%" a -r -ma3 -m3 -ep1 -x*.pak.info "%OUT%" "%BUILD%\app"
if errorlevel 1 ( echo [ERROR] rar pass 3 failed & exit /b 1 )
"%RAR%" a -r -ma3 -m3 -ep1 -x*.pak.info "%OUT%" "%BUILD%\locales"
if errorlevel 1 ( echo [ERROR] rar pass 4 failed & exit /b 1 )
"%RAR%" a -r -ma3 -m3 -ep1 -x*.pak.info "%OUT%" "%BUILD%\swiftshader"
if errorlevel 1 ( echo [ERROR] rar pass 5 failed & exit /b 1 )

rem --- pass 6: big dll last ---
"%RAR%" a -ma3 -m3 -ep1 "%OUT%" "%BUILD%\nw.dll"
if errorlevel 1 ( echo [ERROR] rar pass 6 failed & exit /b 1 )

echo [OK] pack done: %OUT%
exit /b 0
