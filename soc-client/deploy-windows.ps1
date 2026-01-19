# SOC Client Deployment Script for Windows
# Run as Administrator
#
# Usage:
#   .\deploy-windows.ps1 [-AgentName "MyPC"] [-ManagerIP "192.168.1.206"] [-InstallTests]

param(
    [string]$AgentName = $env:COMPUTERNAME,
    [string]$ManagerIP = "192.168.1.206",
    [string]$WazuhVersion = "4.14.1",
    [switch]$InstallTests
)

$TempDir = "$env:TEMP\wazuh-install"
$TestDir = "C:\soc-agent\tests"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  SOC Client Deployment (Windows)" -ForegroundColor Cyan
Write-Host "  Version: $WazuhVersion" -ForegroundColor Cyan
Write-Host "  Manager: $ManagerIP" -ForegroundColor Cyan
Write-Host "  Agent:   $AgentName" -ForegroundColor Cyan
Write-Host "  Tests:   $InstallTests" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red
    exit 1
}

# Create temp directory
if (Test-Path $TempDir) { Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

Write-Host ""
Write-Host "[1/4] Downloading Wazuh Agent..." -ForegroundColor Yellow

$MsiUrl = "https://packages.wazuh.com/4.x/windows/wazuh-agent-$WazuhVersion-1.msi"
$MsiPath = "$TempDir\wazuh-agent.msi"

try {
    Invoke-WebRequest -Uri $MsiUrl -OutFile $MsiPath -UseBasicParsing
}
catch {
    Write-Host "ERROR: Failed to download Wazuh Agent MSI." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Installing Wazuh Agent..." -ForegroundColor Yellow

# Uninstall existing if present to avoid conflicts is usually handled by MSI, but logging it
if (Get-Service WazuhSvc -ErrorAction SilentlyContinue) {
    Write-Host "Warning: WazuhSvc already exists. Updating/Reinstalling..." -ForegroundColor DarkYellow
}

$Arguments = "/i `"$MsiPath`" /q WAZUH_MANAGER=`"$ManagerIP`" WAZUH_AGENT_NAME=`"$AgentName`" WAZUH_REGISTRATION_SERVER=`"$ManagerIP`""
Start-Process msiexec.exe -ArgumentList $Arguments -Wait -NoNewWindow

Write-Host "[3/4] Configuring Agent..." -ForegroundColor Yellow

# Optional: Add specific config here if needed using Add-Content to ossec.conf
# Note: Windows FIM is different path conventions

if ($InstallTests) {
    Write-Host "[Optional] Downloading SOC Test Scripts..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $TestDir | Out-Null
    
    $BaseUrl = "https://raw.githubusercontent.com/pace-soc/pace-soc/main/soc-agent/tests"
    $Files = @("run-all-tests.sh", "test-bruteforce.sh", "test-file-integrity.sh", "test-malware.sh", "test-network-scan.sh", "test-privilege-escalation.sh", "test-web-attack.sh", "README.md")

    foreach ($file in $Files) {
        Write-Host "Downloading $file..."
        try {
            Invoke-WebRequest -Uri "$BaseUrl/$file" -OutFile "$TestDir\$file" -UseBasicParsing
        }
        catch {
            Write-Host "Failed to download $file" -ForegroundColor Red
        }
    }
    
    # Create a batch wrapper for running tests via git bash or WSL if available
    Set-Content -Path "$TestDir\NOTE.txt" -Value "To run these tests, execute them in WSL or Git Bash."
    Write-Host "Test scripts downloaded to $TestDir" -ForegroundColor Green
}

Write-Host "[4/4] Starting Wazuh Service..." -ForegroundColor Yellow

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
if ($InstallTests) {
    Write-Host "    Tests located at: $TestDir"
}
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
