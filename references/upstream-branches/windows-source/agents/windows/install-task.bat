@echo off
REM Register a Windows Task Scheduler task to run the agent at logon.
REM Run this as Administrator from the directory containing the .exe

set "AGENT_PATH=%~dp0live-dashboard-agent.exe"
set "TASK_NAME=LiveDashboardAgent"

echo Registering scheduled task: %TASK_NAME%
echo Agent path: %AGENT_PATH%
echo.

schtasks /create /tn "%TASK_NAME%" /tr "%AGENT_PATH%" /sc onlogon /rl highest /f

if %errorlevel% equ 0 (
    echo Task registered successfully.
    echo The agent will start automatically at next logon.
    echo.
    echo To start it now:
    echo   schtasks /run /tn "%TASK_NAME%"
    echo.
    echo To remove it later:
    echo   schtasks /delete /tn "%TASK_NAME%" /f
) else (
    echo Failed to register task. Make sure you are running as Administrator.
)

pause
