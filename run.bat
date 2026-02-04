@echo off

REM Transaction Tapestry View - Run Script (Windows)
REM This script sets up and runs the development server

echo Transaction Tapestry View
echo ==============================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Start the development server
echo Starting development server...
echo The app will open at http://localhost:5173
echo.
call npm run dev
