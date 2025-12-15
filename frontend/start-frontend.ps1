# PowerShell script to start frontend with proper configuration
Write-Host "Starting CCIS-CodeHub Frontend..." -ForegroundColor Green
Write-Host ""

# Kill any process on port 3000
$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($processes) {
    Write-Host "Killing processes on port 3000..." -ForegroundColor Yellow
    foreach ($pid in $processes) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Starting Vite development server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "The server will be available at:" -ForegroundColor Green
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  http://127.0.0.1:3000" -ForegroundColor Cyan
Write-Host ""

# Start Vite
npm run dev
