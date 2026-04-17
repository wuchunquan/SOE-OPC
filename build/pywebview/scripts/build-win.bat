@echo off
setlocal

cd /d "%~dp0\..\..\.."
set "REPO_ROOT=%CD%"
set "PYROOT=%REPO_ROOT%\pysrc"
set "WORKDIR=%REPO_ROOT%\build\pywebview\work\win"
set "DISTDIR=%REPO_ROOT%\build\pywebview\release"
set "SPEC=%REPO_ROOT%\build\pywebview\spec\windows.spec"

echo ====================================
echo pywebview Windows build
echo ====================================
echo.

echo [1/3] Activating virtual environment...
if exist "%PYROOT%\.venv\Scripts\activate.bat" (
    call "%PYROOT%\.venv\Scripts\activate.bat"
    echo Virtual environment activated.
) else (
    echo Virtual environment not found: %PYROOT%\.venv
    pause
    exit /b 1
)
echo.

echo [2/3] Cleaning old output...
if exist "%DISTDIR%" rd /s /q "%DISTDIR%"
if exist "%WORKDIR%" rd /s /q "%WORKDIR%"
echo.

echo [3/3] Building pywebview desktop app with PyInstaller...
pyinstaller --distpath "%DISTDIR%" --workpath "%WORKDIR%" "%SPEC%"

if errorlevel 1 (
    echo.
    echo Build failed.
    pause
    exit /b 1
)

echo.
echo ====================================
echo Build complete
echo ====================================
echo Output directory: %DISTDIR%
echo.
pause
