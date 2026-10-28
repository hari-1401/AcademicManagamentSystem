@echo off
echo ========================================
echo Starting Academic Evaluation System
echo ========================================
echo.

echo [1/3] Starting MongoDB...
start "MongoDB" cmd /k "mongod"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Backend (FastAPI)...
start "Backend" cmd /k "cd /d %~dp0 && python app\main.py"
timeout /t 5 /nobreak >nul

echo [3/3] Starting Frontend (React)...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo All services started!
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

taskkill /FI "WindowTitle eq MongoDB*" /T /F
taskkill /FI "WindowTitle eq Backend*" /T /F
taskkill /FI "WindowTitle eq Frontend*" /T /F
