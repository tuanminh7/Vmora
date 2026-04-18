param(
    [int]$BackendPort = 8001,
    [int]$FrontendPort = 5173,
    [switch]$StopOnly,
    [switch]$NoDocker
)

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"
$BackendPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$BackendEnv = Join-Path $BackendDir ".env"
$BackendEnvExample = Join-Path $BackendDir ".env.example"
$FrontendEnv = Join-Path $FrontendDir ".env"
$FrontendEnvExample = Join-Path $FrontendDir ".env.example"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Stop-ProjectProcesses {
    Write-Step "Dung cac process backend/frontend trung cua du an"

    $currentPid = $PID
    $projectProcesses = Get-CimInstance Win32_Process |
        Where-Object {
            $_.ProcessId -ne $currentPid -and
            $_.CommandLine -and
            $_.CommandLine.Contains($RootDir) -and
            (
                $_.CommandLine -match "uvicorn" -or
                $_.CommandLine -match "vite" -or
                $_.CommandLine -match "npm-cli.js.*run dev"
            )
        }

    foreach ($process in $projectProcesses) {
        try {
            Stop-Process -Id $process.ProcessId -Force
            Write-Host "Da dung PID $($process.ProcessId): $($process.Name)"
        } catch {
            Write-Host "Khong dung duoc PID $($process.ProcessId): $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }

    if (-not $projectProcesses) {
        Write-Host "Khong co process trung can dung."
    }
}

function Ensure-EnvFile {
    param(
        [string]$EnvPath,
        [string]$ExamplePath
    )

    if (-not (Test-Path $EnvPath) -and (Test-Path $ExamplePath)) {
        Copy-Item $ExamplePath $EnvPath
        Write-Host "Da tao $EnvPath tu file example."
    }
}

function Set-FrontendApiBaseUrl {
    $apiBaseUrl = "http://127.0.0.1:$BackendPort/api"
    $line = "VITE_API_BASE_URL=$apiBaseUrl"

    if (-not (Test-Path $FrontendEnv)) {
        Set-Content -Path $FrontendEnv -Value $line -Encoding UTF8
        Write-Host "Da tao frontend .env voi backend port $BackendPort."
        return
    }

    $content = Get-Content $FrontendEnv
    if ($content -match "^VITE_API_BASE_URL=") {
        $content = $content | ForEach-Object {
            if ($_ -match "^VITE_API_BASE_URL=") { $line } else { $_ }
        }
    } else {
        $content += $line
    }

    Set-Content -Path $FrontendEnv -Value $content -Encoding UTF8
    Write-Host "Frontend se goi backend tai $apiBaseUrl."
}

function Ensure-BackendVenv {
    if (-not (Test-Path $BackendPython)) {
        Write-Step "Tao Python virtualenv cho backend"
        py -3 -m venv (Join-Path $BackendDir ".venv")
    }
}

function Ensure-BackendDependencies {
    Write-Step "Kiem tra dependency backend"
    $env:PYTHONUTF8 = "1"
    $env:PYTHONIOENCODING = "utf-8"
    $env:PIP_PROGRESS_BAR = "off"

    $check = & $BackendPython -c "import fastapi, asyncpg, redis, sqlalchemy" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Backend dependency da san sang."
        return
    }

    Write-Host "Thieu dependency backend, dang cai requirements.txt..."
    & $BackendPython -m pip install --disable-pip-version-check --progress-bar off -r (Join-Path $BackendDir "requirements.txt")
}

function Ensure-FrontendDependencies {
    $nodeModules = Join-Path $FrontendDir "node_modules"
    if (Test-Path $nodeModules) {
        Write-Host "Frontend dependency da san sang."
        return
    }

    Write-Step "Cai dependency frontend"
    Push-Location $FrontendDir
    try {
        npm install
    } finally {
        Pop-Location
    }
}

function Start-DockerServices {
    if ($NoDocker) {
        Write-Host "Bo qua Docker theo tham so -NoDocker."
        return
    }

    Write-Step "Khoi dong PostgreSQL/Redis bang docker compose"
    Push-Location $RootDir
    try {
        docker compose up -d
    } finally {
        Pop-Location
    }
}

function Start-Backend {
    Write-Step "Chay backend tai http://127.0.0.1:$BackendPort"
    $command = @"
Set-Location '$BackendDir'
`$env:PYTHONUTF8='1'
`$env:PYTHONIOENCODING='utf-8'
& '$BackendPython' -m uvicorn app.main:app --host 127.0.0.1 --port $BackendPort
"@
    Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $command
}

function Start-Frontend {
    Write-Step "Chay frontend tai http://localhost:$FrontendPort"
    $command = @"
Set-Location '$FrontendDir'
npm run dev -- --host localhost --port $FrontendPort
"@
    Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $command
}

function Wait-BackendHealth {
    Write-Step "Kiem tra backend health"
    $healthUrl = "http://127.0.0.1:$BackendPort/api/health"

    for ($i = 1; $i -le 20; $i++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing $healthUrl -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Host "Backend OK: $($response.Content)" -ForegroundColor Green
                return
            }
        } catch {
            Start-Sleep -Seconds 1
        }
    }

    Write-Host "Backend chua phan hoi. Hay xem cua so backend vua mo de doc log loi." -ForegroundColor Yellow
}

Stop-ProjectProcesses

if ($StopOnly) {
    Write-Step "Da dung project theo yeu cau -StopOnly"
    exit 0
}

Ensure-EnvFile -EnvPath $BackendEnv -ExamplePath $BackendEnvExample
Ensure-EnvFile -EnvPath $FrontendEnv -ExamplePath $FrontendEnvExample
Set-FrontendApiBaseUrl
Ensure-BackendVenv
Ensure-BackendDependencies
Ensure-FrontendDependencies
Start-DockerServices
Start-Backend
Start-Sleep -Seconds 3
Wait-BackendHealth
Start-Frontend

Write-Step "Hoan tat"
Write-Host "Backend:  http://127.0.0.1:$BackendPort"
Write-Host "Health:   http://127.0.0.1:$BackendPort/api/health"
Write-Host "Frontend: http://localhost:$FrontendPort"
Write-Host ""
Write-Host "Lan sau chi can chay:"
Write-Host ".\run_project.ps1"
Write-Host ""
Write-Host "Neu muon dung backend/frontend cua du an:"
Write-Host ".\run_project.ps1 -StopOnly"
