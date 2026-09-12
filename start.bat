@echo off
echo ========================================================
echo  SIF SENTINEL - DEVELOPMENT MODE
echo ========================================================
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
echo Starting ML Microservice (FastAPI)...
start "SIF ML Service" cmd /k "cd ml_service && uv run uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo.
echo Starting Backend (FastAPI)...
start "SIF Backend" cmd /k "cd backend && uv run uvicorn app.main:app --reload"

echo.
echo Starting Frontend (Development Mode)...
start "SIF Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All three servers are starting up in separate windows!
