# Start Parikshit locally
Write-Host "Starting Parikshit Backend..." -ForegroundColor Cyan
Start-Process -NoNewWindow powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn app.main:app --reload --port 8000"

Write-Host "Starting Parikshit Frontend..." -ForegroundColor Green
Start-Process -NoNewWindow powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Parikshit is launching!" -ForegroundColor Yellow
Write-Host "Backend: http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
