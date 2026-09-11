@echo off
echo Starting SIF Sentinel Application...

echo.
echo Checking Frontend dependencies...
if not exist "frontend\node_modules\" (
    echo node_modules not found. Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo Checking Backend dependencies...
if not exist "backend\.venv\" (
    echo .venv not found. Syncing backend dependencies...
    cd backend
    call uv sync
    cd ..
)

echo.
echo Checking ML Service dependencies...
if not exist "ml_service\.venv\" (
    echo .venv not found. Syncing ML service dependencies...
    cd ml_service
    call uv sync
    cd ..
)

echo.
echo Starting ML Microservice (FastAPI)...
start "SIF ML Service" cmd /k "cd ml_service && uv run uvicorn app.main:app --host 0.0.0.0 --port 8001"

echo.
echo Starting Backend (FastAPI)...
start "SIF Backend" cmd /k "cd backend && uv run uvicorn app.main:app --reload"

echo.
echo Starting Frontend (Next.js)...
start "SIF Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All three servers are starting up in separate windows!
echo Close those windows to stop the servers.
