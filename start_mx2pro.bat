@echo off
REM MX2PRO MICRONAUT AI Startup Script for Windows
REM Launches both Three.js server and Gradio demo

echo ========================================================
echo          MX2PRO MICRONAUT AI - STARTUP
echo    Enhanced Janus with Three.js Graphics Boost
echo ========================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed
    pause
    exit /b 1
)

REM Check dependencies
echo Checking dependencies...
pip list | findstr flask >nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Create directories
echo Creating directories...
if not exist "generated_samples" mkdir generated_samples
if not exist "threejs_graphics\uploads" mkdir threejs_graphics\uploads

REM Start Three.js server
echo Starting Three.js Graphics Server...
cd threejs_graphics
start /B python server.py
cd ..

REM Wait for server to start
echo Waiting for Three.js server to start...
timeout /t 3 /nobreak >nul

REM Start Gradio demo
echo Starting MX2PRO MICRONAUT AI Demo...
python demo\app_mx2pro.py

echo.
echo Shutdown complete
pause
