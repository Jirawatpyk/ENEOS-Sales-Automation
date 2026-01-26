# export-agent.ps1
# Export BMAD agent to another project
# Usage: .\scripts\export-agent.ps1 -AgentName "code-reviewer" -TargetProject "C:\path\to\project"

param(
    [Parameter(Mandatory=$true)]
    [string]$AgentName,

    [Parameter(Mandatory=$true)]
    [string]$TargetProject,

    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   BMAD Agent Export Script" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Source paths (current project)
$SourceRoot = $PSScriptRoot | Split-Path -Parent
$AgentFile = "$SourceRoot\_bmad\bmm\agents\$AgentName.md"
$CommandFile = "$SourceRoot\.claude\commands\bmad\bmm\agents\$AgentName.md"
$ManifestFile = "$SourceRoot\_bmad\_config\agent-manifest.csv"

# Target paths
$TargetAgentDir = "$TargetProject\_bmad\bmm\agents"
$TargetCommandDir = "$TargetProject\.claude\commands\bmad\bmm\agents"
$TargetManifest = "$TargetProject\_bmad\_config\agent-manifest.csv"

Write-Info "Agent: $AgentName"
Write-Info "Source: $SourceRoot"
Write-Info "Target: $TargetProject"
Write-Host ""

# Step 1: Validate source files exist
Write-Host "[1/5] Validating source files..." -ForegroundColor White
if (-not (Test-Path $AgentFile)) {
    Write-Error "Agent file not found: $AgentFile"
    exit 1
}
if (-not (Test-Path $CommandFile)) {
    Write-Error "Command file not found: $CommandFile"
    exit 1
}
Write-Success "  Source files found"

# Step 2: Check target project has BMAD
Write-Host "[2/5] Checking target project..." -ForegroundColor White
if (-not (Test-Path "$TargetProject\_bmad")) {
    Write-Error "Target project does not have BMAD installed!"
    Write-Warning "  Missing: $TargetProject\_bmad"
    Write-Info "  Install BMAD first, then run this script again."
    exit 1
}
Write-Success "  BMAD found in target project"

# Step 3: Create directories if needed
Write-Host "[3/5] Creating directories..." -ForegroundColor White
if (-not (Test-Path $TargetAgentDir)) {
    New-Item -ItemType Directory -Path $TargetAgentDir -Force | Out-Null
    Write-Success "  Created: $TargetAgentDir"
}
if (-not (Test-Path $TargetCommandDir)) {
    New-Item -ItemType Directory -Path $TargetCommandDir -Force | Out-Null
    Write-Success "  Created: $TargetCommandDir"
}
Write-Success "  Directories ready"

# Step 4: Copy files
Write-Host "[4/5] Copying files..." -ForegroundColor White

$TargetAgentFile = "$TargetAgentDir\$AgentName.md"
$TargetCommandFile = "$TargetCommandDir\$AgentName.md"

# Check if files exist
if ((Test-Path $TargetAgentFile) -and -not $Force) {
    Write-Warning "  Agent already exists: $TargetAgentFile"
    Write-Warning "  Use -Force to overwrite"
    exit 1
}

Copy-Item $AgentFile $TargetAgentFile -Force
Write-Success "  Copied: _bmad\bmm\agents\$AgentName.md"

Copy-Item $CommandFile $TargetCommandFile -Force
Write-Success "  Copied: .claude\commands\bmad\bmm\agents\$AgentName.md"

# Step 5: Update manifest
Write-Host "[5/5] Updating manifest..." -ForegroundColor White

# Read source manifest and find the agent entry
$SourceManifestContent = Get-Content $ManifestFile
$AgentEntry = $SourceManifestContent | Where-Object { $_ -match "^`"$AgentName`"" }

if (-not $AgentEntry) {
    Write-Warning "  Agent entry not found in source manifest"
    Write-Warning "  You may need to add it manually to: $TargetManifest"
} else {
    # Check if entry already exists in target
    if (Test-Path $TargetManifest) {
        $TargetManifestContent = Get-Content $TargetManifest
        $ExistingEntry = $TargetManifestContent | Where-Object { $_ -match "^`"$AgentName`"" }

        if ($ExistingEntry -and -not $Force) {
            Write-Warning "  Entry already exists in target manifest"
            Write-Warning "  Use -Force to overwrite"
        } elseif ($ExistingEntry -and $Force) {
            # Replace existing entry
            $TargetManifestContent = $TargetManifestContent | ForEach-Object {
                if ($_ -match "^`"$AgentName`"") { $AgentEntry } else { $_ }
            }
            $TargetManifestContent | Set-Content $TargetManifest
            Write-Success "  Updated manifest entry"
        } else {
            # Append new entry
            Add-Content $TargetManifest $AgentEntry
            Write-Success "  Added manifest entry"
        }
    } else {
        Write-Warning "  Target manifest not found: $TargetManifest"
        Write-Warning "  You may need to create it manually"
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Export Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Next steps:"
Write-Host "  1. Restart Claude Code in target project"
Write-Host "  2. Run: /bmad:bmm:agents:$AgentName"
Write-Host ""
