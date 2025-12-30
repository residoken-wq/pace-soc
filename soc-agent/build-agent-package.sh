#!/bin/bash
# SOC Agent Deployment Package Builder
# Creates a complete offline installation bundle for Wazuh agents

set -e

WAZUH_VERSION="4.7.2"
MANAGER_IP="${WAZUH_MANAGER_IP:-192.168.1.206}"
OUTPUT_DIR="soc-agent-deployment"
PACKAGE_NAME="soc-agent-bundle-${WAZUH_VERSION}.tar.gz"

echo "================================================"
echo "  SOC Agent Deployment Package Builder"
echo "  Wazuh Version: ${WAZUH_VERSION}"
echo "  Manager IP: ${MANAGER_IP}"
echo "================================================"

# Create output directory
mkdir -p "${OUTPUT_DIR}/packages/linux"
mkdir -p "${OUTPUT_DIR}/packages/windows"
mkdir -p "${OUTPUT_DIR}/scripts"
mkdir -p "${OUTPUT_DIR}/config"

echo ""
echo "[1/5] Downloading Linux packages..."

# Ubuntu/Debian packages
echo "  - Downloading Wazuh agent DEB package..."
curl -sL "https://packages.wazuh.com/4.x/apt/pool/main/w/wazuh-agent/wazuh-agent_${WAZUH_VERSION}-1_amd64.deb" \
    -o "${OUTPUT_DIR}/packages/linux/wazuh-agent_${WAZUH_VERSION}_amd64.deb"

# CentOS/RHEL packages
echo "  - Downloading Wazuh agent RPM package..."
curl -sL "https://packages.wazuh.com/4.x/yum/wazuh-agent-${WAZUH_VERSION}-1.x86_64.rpm" \
    -o "${OUTPUT_DIR}/packages/linux/wazuh-agent-${WAZUH_VERSION}.x86_64.rpm"

echo ""
echo "[2/5] Downloading Windows packages..."
curl -sL "https://packages.wazuh.com/4.x/windows/wazuh-agent-${WAZUH_VERSION}-1.msi" \
    -o "${OUTPUT_DIR}/packages/windows/wazuh-agent-${WAZUH_VERSION}.msi"

echo ""
echo "[3/5] Creating installation scripts..."

# Ubuntu/Debian install script
cat > "${OUTPUT_DIR}/scripts/install-ubuntu.sh" << 'SCRIPT'
#!/bin/bash
# Wazuh Agent Installation Script for Ubuntu/Debian
# Usage: sudo ./install-ubuntu.sh [AGENT_NAME]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_NAME="${1:-$(hostname)}"
MANAGER_IP="__MANAGER_IP__"
WAZUH_VERSION="__WAZUH_VERSION__"

echo "Installing Wazuh Agent ${WAZUH_VERSION}..."
echo "Agent Name: ${AGENT_NAME}"
echo "Manager IP: ${MANAGER_IP}"

# Install package
dpkg -i "${SCRIPT_DIR}/../packages/linux/wazuh-agent_${WAZUH_VERSION}_amd64.deb"

# Configure manager IP
sed -i "s/MANAGER_IP/${MANAGER_IP}/" /var/ossec/etc/ossec.conf

# Set agent address
cat >> /var/ossec/etc/ossec.conf << EOF
  <client>
    <server>
      <address>${MANAGER_IP}</address>
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
  </client>
EOF

# Enable and start
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent

echo ""
echo "✅ Wazuh Agent installed successfully!"
echo "   Check status: systemctl status wazuh-agent"
SCRIPT

# Replace placeholders
sed -i "s/__MANAGER_IP__/${MANAGER_IP}/g" "${OUTPUT_DIR}/scripts/install-ubuntu.sh"
sed -i "s/__WAZUH_VERSION__/${WAZUH_VERSION}/g" "${OUTPUT_DIR}/scripts/install-ubuntu.sh"
chmod +x "${OUTPUT_DIR}/scripts/install-ubuntu.sh"

# CentOS/RHEL install script
cat > "${OUTPUT_DIR}/scripts/install-centos.sh" << 'SCRIPT'
#!/bin/bash
# Wazuh Agent Installation Script for CentOS/RHEL
# Usage: sudo ./install-centos.sh [AGENT_NAME]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_NAME="${1:-$(hostname)}"
MANAGER_IP="__MANAGER_IP__"
WAZUH_VERSION="__WAZUH_VERSION__"

echo "Installing Wazuh Agent ${WAZUH_VERSION}..."
echo "Agent Name: ${AGENT_NAME}"
echo "Manager IP: ${MANAGER_IP}"

# Install package
rpm -ivh "${SCRIPT_DIR}/../packages/linux/wazuh-agent-${WAZUH_VERSION}.x86_64.rpm"

# Configure manager
echo "<ossec_config>
  <client>
    <server>
      <address>${MANAGER_IP}</address>
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
  </client>
</ossec_config>" > /var/ossec/etc/ossec.conf

# Enable and start
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent

echo ""
echo "✅ Wazuh Agent installed successfully!"
SCRIPT

sed -i "s/__MANAGER_IP__/${MANAGER_IP}/g" "${OUTPUT_DIR}/scripts/install-centos.sh"
sed -i "s/__WAZUH_VERSION__/${WAZUH_VERSION}/g" "${OUTPUT_DIR}/scripts/install-centos.sh"
chmod +x "${OUTPUT_DIR}/scripts/install-centos.sh"

# Windows install script (PowerShell)
cat > "${OUTPUT_DIR}/scripts/install-windows.ps1" << 'SCRIPT'
# Wazuh Agent Installation Script for Windows
# Run as Administrator

param(
    [string]$AgentName = $env:COMPUTERNAME
)

$ManagerIP = "__MANAGER_IP__"
$WazuhVersion = "__WAZUH_VERSION__"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Installing Wazuh Agent $WazuhVersion..."
Write-Host "Agent Name: $AgentName"
Write-Host "Manager IP: $ManagerIP"

# Install MSI
$MsiPath = Join-Path $ScriptDir "..\packages\windows\wazuh-agent-$WazuhVersion.msi"
Start-Process msiexec.exe -ArgumentList "/i `"$MsiPath`" /q WAZUH_MANAGER=`"$ManagerIP`" WAZUH_AGENT_NAME=`"$AgentName`"" -Wait

# Start service
Start-Service WazuhSvc

Write-Host ""
Write-Host "Wazuh Agent installed successfully!" -ForegroundColor Green
Write-Host "Check status: Get-Service WazuhSvc"
SCRIPT

sed -i "s/__MANAGER_IP__/${MANAGER_IP}/g" "${OUTPUT_DIR}/scripts/install-windows.ps1"
sed -i "s/__WAZUH_VERSION__/${WAZUH_VERSION}/g" "${OUTPUT_DIR}/scripts/install-windows.ps1"

echo ""
echo "[4/5] Creating README..."

cat > "${OUTPUT_DIR}/README.md" << EOF
# SOC Agent Deployment Package

**Version:** ${WAZUH_VERSION}
**Manager IP:** ${MANAGER_IP}
**Created:** $(date '+%Y-%m-%d %H:%M:%S')

## Contents

\`\`\`
soc-agent-deployment/
├── packages/
│   ├── linux/
│   │   ├── wazuh-agent_${WAZUH_VERSION}_amd64.deb  (Ubuntu/Debian)
│   │   └── wazuh-agent-${WAZUH_VERSION}.x86_64.rpm  (CentOS/RHEL)
│   └── windows/
│       └── wazuh-agent-${WAZUH_VERSION}.msi
├── scripts/
│   ├── install-ubuntu.sh
│   ├── install-centos.sh
│   └── install-windows.ps1
└── README.md
\`\`\`

## Installation

### Ubuntu/Debian
\`\`\`bash
cd soc-agent-deployment
sudo ./scripts/install-ubuntu.sh [AGENT_NAME]
\`\`\`

### CentOS/RHEL
\`\`\`bash
cd soc-agent-deployment
sudo ./scripts/install-centos.sh [AGENT_NAME]
\`\`\`

### Windows (PowerShell as Admin)
\`\`\`powershell
cd soc-agent-deployment
.\scripts\install-windows.ps1 -AgentName "MYPC"
\`\`\`

## Verify Installation

### Linux
\`\`\`bash
systemctl status wazuh-agent
cat /var/ossec/etc/client.keys
\`\`\`

### Windows
\`\`\`powershell
Get-Service WazuhSvc
\`\`\`

## Troubleshooting

1. **Agent not connecting:** Check firewall ports 1514, 1515
2. **Registration failed:** Ensure manager authd service is running
3. **Logs location:**
   - Linux: /var/ossec/logs/ossec.log
   - Windows: C:\\Program Files (x86)\\ossec-agent\\ossec.log
EOF

echo ""
echo "[5/5] Creating deployment bundle..."

tar -czvf "${PACKAGE_NAME}" "${OUTPUT_DIR}"

echo ""
echo "================================================"
echo "  ✅ Deployment package created successfully!"
echo "================================================"
echo ""
echo "  Package: ${PACKAGE_NAME}"
echo "  Size: $(du -h ${PACKAGE_NAME} | cut -f1)"
echo ""
echo "  Transfer to target machines and extract:"
echo "  tar -xzvf ${PACKAGE_NAME}"
echo ""
echo "  Then run the appropriate install script."
echo "================================================"
