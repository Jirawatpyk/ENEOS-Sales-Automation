@echo off
REM Export BMAD Agent to another project
REM Usage: export-agent.bat [agent-name] [target-project-path]
REM Example: export-agent.bat code-reviewer "C:\Projects\my-other-project"

if "%~1"=="" (
    echo.
    echo Usage: export-agent.bat [agent-name] [target-project-path]
    echo.
    echo Available agents:
    echo   - code-reviewer  (Rex - Code Review Specialist)
    echo   - dev            (Amelia - Developer)
    echo   - architect      (Architect)
    echo   - pm             (Product Manager)
    echo   - analyst        (Business Analyst)
    echo.
    echo Example:
    echo   export-agent.bat code-reviewer "C:\Projects\other-project"
    echo.
    exit /b 1
)

if "%~2"=="" (
    echo Error: Target project path is required
    echo Usage: export-agent.bat [agent-name] [target-project-path]
    exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0export-agent.ps1" -AgentName "%~1" -TargetProject "%~2"
