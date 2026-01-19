#!/bin/bash
# ==============================================
# SOC Client Deployment Script
# ==============================================
# Usage:
#   sudo ./deploy.sh [AGENT_NAME] [MANAGER_IP] [WAZUH_VERSION]
#
# Options:
#   --install-tests    Download SOC self-test scripts to /opt/soc-agent/tests
# ==============================================

set -euo pipefail

# --- Configuration ---
# Defaults
DEFAULT_MANAGER_IP="115.79.5.5"
DEFAULT_WAZUH_VERSION="4.14.1"
INSTALL_TESTS=false
AGENT_NAME=""
MANAGER_IP=""
WAZUH_VERSION=""

# Parse Arguments
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    --install-tests)
      INSTALL_TESTS=true
      shift # past argument
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift # past argument
      ;;
  esac
done

set -- "${POSITIONAL_ARGS[@]-}" # restore positional parameters

AGENT_NAME="${1:-$(hostname)}"
MANAGER_IP="${2:-$DEFAULT_MANAGER_IP}"
WAZUH_VERSION="${3:-$DEFAULT_WAZUH_VERSION}"

# --- Logging ---
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "================================================"
echo "  SOC Client Deployment"
echo "================================================"
echo "  Agent Name:    ${AGENT_NAME}"
echo "  Manager IP:    ${MANAGER_IP}"
echo "  Wazuh Version: ${WAZUH_VERSION}"
echo "  Install Tests: ${INSTALL_TESTS}"
echo "================================================"

# --- 0. Pre-checks ---
if [[ $EUID -ne 0 ]]; then
   err "This script must be run as root. Use sudo."
   exit 1
fi

# Ensure /opt/soc-agent exists for Syscheck (FIM)
mkdir -p /opt/soc-agent

# --- OS Detection ---
if [ -f /etc/debian_version ]; then
    OS="debian"
    LOG_SYSLOG="/var/log/syslog"
    LOG_AUTH="/var/log/auth.log"
elif [ -f /etc/redhat-release ]; then
    OS="redhat"
    LOG_SYSLOG="/var/log/messages"
    LOG_AUTH="/var/log/secure"
else
    err "Unsupported OS. Use Ubuntu/Debian or CentOS/RHEL."
    exit 1
fi

log "Detected OS family: $OS"

# --- 1. Add Repository ---
log "[1/5] Adding Wazuh repository..."

if [ "$OS" = "debian" ]; then
    if ! command -v curl >/dev/null; then apt-get update && apt-get install -y curl gnupg lsb-release; fi
    curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import 2>/dev/null && chmod 644 /usr/share/keyrings/wazuh.gpg
    echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list > /dev/null
    apt-get update -qq
else
    rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH
    cat > /etc/yum.repos.d/wazuh.repo << EOF
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=Wazuh repository
baseurl=https://packages.wazuh.com/4.x/yum/
protect=1
EOF
fi

# --- 2. Install Agent ---
log "[2/5] Installing Wazuh Agent ${WAZUH_VERSION}..."

if [ "$OS" = "debian" ]; then
    WAZUH_MANAGER="${MANAGER_IP}" WAZUH_AGENT_NAME="${AGENT_NAME}" apt-get install -y wazuh-agent=${WAZUH_VERSION}-1
else
    WAZUH_MANAGER="${MANAGER_IP}" WAZUH_AGENT_NAME="${AGENT_NAME}" yum install -y wazuh-agent-${WAZUH_VERSION}
fi

# --- 3. Configure Agent ---
log "[3/5] Configuring agent..."

# Ensure ossec.conf has correct server config
cat > /var/ossec/etc/ossec.conf << EOF
<ossec_config>
  <client>
    <server>
      <address>${MANAGER_IP}</address>
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
    <config-profile>ubuntu, debian, redhat, centos, linux</config-profile>
    <notify_time>10</notify_time>
    <time-reconnect>60</time-reconnect>
    <auto_restart>yes</auto_restart>
  </client>
  
  <client_buffer>
    <disabled>no</disabled>
    <queue_size>5000</queue_size>
    <events_per_second>500</events_per_second>
  </client_buffer>

  <logging>
    <log_format>plain</log_format>
  </logging>

  <localfile>
    <log_format>syslog</log_format>
    <location>${LOG_SYSLOG}</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>${LOG_AUTH}</location>
  </localfile>

  <!-- Monitor SOC Agent Tests if installed -->
  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/soc-tests.log</location>
  </localfile>

  <rootcheck>
    <disabled>no</disabled>
  </rootcheck>

  <syscheck>
    <disabled>no</disabled>
    <frequency>43200</frequency>
    <directories>/etc,/usr/bin,/usr/sbin</directories>
    <directories>/bin,/sbin,/boot</directories>
    <!-- Monitor SOC Test files for FIM -->
    <directories realtime="yes" check_all="yes">/opt/soc-agent</directories>
  </syscheck>

  <wodle name="syscollector">
    <disabled>no</disabled>
    <interval>1h</interval>
    <scan_on_start>yes</scan_on_start>
    <hardware>yes</hardware>
    <os>yes</os>
    <network>yes</network>
    <packages>yes</packages>
    <ports>yes</ports>
    <processes>yes</processes>
  </wodle>
</ossec_config>
EOF

# --- 4. Install Tests (Optional) ---
if [ "$INSTALL_TESTS" = true ]; then
    log "[4/5] Installing SOC Self-Test Scripts..."
    TEST_DIR="/opt/soc-agent/tests"
    mkdir -p "$TEST_DIR"
    
    # We download individual files from raw.githubusercontent.com to avoid needing git
    # Assuming 'main' branch.
    BASE_URL="https://raw.githubusercontent.com/pace-soc/pace-soc/main/soc-agent/tests"
    FILES=("run-all-tests.sh" "test-bruteforce.sh" "test-file-integrity.sh" "test-malware.sh" "test-network-scan.sh" "test-privilege-escalation.sh" "test-web-attack.sh" "README.md")

    for file in "${FILES[@]}"; do
        log "Downloading $file..."
        if curl -sSLf "$BASE_URL/$file" -o "$TEST_DIR/$file"; then
             chmod +x "$TEST_DIR/$file"
        else
             warn "Failed to download $file. Checking fallback..."
             # If running from local repo (dev mode)
             if [ -f "$(dirname "$0")/../soc-agent/tests/$file" ]; then
                  cp "$(dirname "$0")/../soc-agent/tests/$file" "$TEST_DIR/$file"
                  chmod +x "$TEST_DIR/$file"
                  log "Copied local $file"
             else
                  err "Could not install $file"
             fi
        fi
    done
    
    log "Test scripts installed to $TEST_DIR"
    log "Run them with: sudo $TEST_DIR/run-all-tests.sh"
else
    log "[4/5] Skipping test scripts (use --install-tests to include)"
fi

# --- 5. Start Agent ---
log "[5/5] Starting Wazuh Agent..."

systemctl daemon-reload
systemctl enable wazuh-agent
systemctl restart wazuh-agent

# Wait for registration
sleep 5

echo ""
echo "================================================"
echo "  ✅ SOC Client Deployed Successfully!"
echo "================================================"
echo ""
echo "  Agent Name: ${AGENT_NAME}"
echo "  Manager:    ${MANAGER_IP}"
echo "  Status:     $(systemctl is-active wazuh-agent)"
echo ""
echo "  Useful commands:"
echo "    systemctl status wazuh-agent"
echo "    tail -f /var/ossec/logs/ossec.log"
echo "    cat /var/ossec/etc/client.keys"
if [ "$INSTALL_TESTS" = true ]; then
    echo "    Run Tests: sudo /opt/soc-agent/tests/run-all-tests.sh"
fi
echo ""
echo "================================================"
