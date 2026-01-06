# SOC Client Deployment Script for Windows
# Run as Administrator
#
# Usage:
#   .\deploy-windows.ps1 [-AgentName "MyPC"]

param(
    [string]$AgentName = $env:COMPUTERNAME
)

$WazuhVersion = "4.14.1"
$ManagerIP = "192.168.1.206"
$TempDir = "$env:TEMP\wazuh-install"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  SOC Client Deployment (Windows)" -ForegroundColor Cyan
Write-Host "  Version: $WazuhVersion" -ForegroundColor Cyan
Write-Host "  Manager: $ManagerIP" -ForegroundColor Cyan
Write-Host "  Agent:   $AgentName" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red
    exit 1
}

# Create temp directory
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

Write-Host ""
Write-Host "[1/3] Downloading Wazuh Agent..." -ForegroundColor Yellow

$MsiUrl = "https://packages.wazuh.com/4.x/windows/wazuh-agent-$WazuhVersion-1.msi"
$MsiPath = "$TempDir\wazuh-agent.msi"

Invoke-WebRequest -Uri $MsiUrl -OutFile $MsiPath -UseBasicParsing

Write-Host "[2/3] Installing Wazuh Agent..." -ForegroundColor Yellow

$Arguments = "/i `"$MsiPath`" /q WAZUH_MANAGER=`"$ManagerIP`" WAZUH_AGENT_NAME=`"$AgentName`" WAZUH_REGISTRATION_SERVER=`"$ManagerIP`""
Start-Process msiexec.exe -ArgumentList $Arguments -Wait -NoNewWindow

Write-Host "[3/3] Starting Wazuh Service..." -ForegroundColor Yellow

Start-Service WazuhSvc -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# Cleanup
Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  SOC Client Deployed Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Agent Name: $AgentName"
Write-Host "  Manager:    $ManagerIP"
Write-Host "  Status:     $((Get-Service WazuhSvc).Status)"
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Gray
Write-Host "    Get-Service WazuhSvc"
Write-Host "    Get-Content 'C:\Program Files (x86)\ossec-agent\ossec.log' -Tail 20"
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
