#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SOC_CENTER_IP="${SOC_CENTER_IP:-192.168.1.206}"
WAZUH_MANAGER_IP="$SOC_CENTER_IP"
LOKI_URL="http://${SOC_CENTER_IP}:3100/loki/api/v1/push"
SOC_DIR="/opt/soc-agent"

# --- Colors & Logging ---
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[SOC-AGENT]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# --- Checks ---
require_root() {
    if [ "$(id -u)" -ne 0 ]; then
        err "This script must be run as root."
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_ID="${ID:-unknown}"
        VERSION_ID="${VERSION_ID:-}"
        log "Detected OS: $OS_ID $VERSION_ID"
    else
        err "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
}

# --- Install Functions ---
install_docker() {
    if command -v docker >/dev/null 2>&1; then
        log "Docker is already installed."
        return
    fi

    log "Installing Docker..."
    if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
        apt-get update -qq
        apt-get install -y docker.io docker-compose-plugin
        systemctl enable --now docker
    elif [ "$OS_ID" = "centos" ] || [ "$OS_ID" = "rhel" ]; then
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        systemctl enable --now docker
    else
        err "Unsupported OS for automatic Docker installation."
        exit 1
    fi
}

install_wazuh_agent() {
    if systemctl is-active --quiet wazuh-agent; then
        log "Wazuh Agent is already running."
        return
    fi

    log "Installing Wazuh Agent..."
    if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
        curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | apt-key add -
        echo "deb https://packages.wazuh.com/4.x/apt stable main" > /etc/apt/sources.list.d/wazuh.list
        apt-get update -qq
        apt-get install -y wazuh-agent
    elif [ "$OS_ID" = "centos" ] || [ "$OS_ID" = "rhel" ]; then
        rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH
        cat > /etc/yum.repos.d/wazuh.repo <<EOF
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=EL-\$releasever - Wazuh
baseurl=https://packages.wazuh.com/4.x/yum/
protect=1
EOF
        yum install -y wazuh-agent
    fi

    # Configure Wazuh
    sed -i "s#<address>.*</address>#<address>${WAZUH_MANAGER_IP}</address>#" /var/ossec/etc/ossec.conf
    
    # Enable and Restart
    systemctl daemon-reload
    systemctl enable wazuh-agent
    systemctl restart wazuh-agent
    log "Wazuh Agent installed and started."
}

setup_soc_dir() {
    log "Setting up SOC Directory at $SOC_DIR..."
    mkdir -p "$SOC_DIR"

    # Copy config files if they exist in current directory (Pack Mode)
    # Otherwise, we could generate them here as fallback (omitted for brevity, relying on pack)
    if [ -f "docker-compose.yml" ]; then
        cp "docker-compose.yml" "$SOC_DIR/"
    else
        err "docker-compose.yml not found in current directory!"
        exit 1
    fi

    if [ -f "promtail.yml" ]; then
        cp "promtail.yml" "$SOC_DIR/"
    else
        err "promtail.yml not found in current directory!"
        exit 1
    fi
    
    # Set permissions (Security)
    chmod 600 "$SOC_DIR/promtail.yml"
    chmod 600 "$SOC_DIR/docker-compose.yml"
}

start_services() {
    log "Starting Docker services..."
    cd "$SOC_DIR"
    docker compose up -d
    
    # Verification
    if docker compose ps | grep -q "Up"; then
        log "Services are running."
    else
        err "Failed to start services. Check 'docker compose logs'."
    fi
}

main() {
    log "Starting SOC Agent Bootstrap..."
    require_root
    detect_os
    
    install_docker
    install_wazuh_agent
    
    setup_soc_dir
    start_services

    log "---------------------------------------------------"
    log "Installation Complete!"
    log "1. Wazuh Agent: ACTIVE (Check Wazuh Dashboard to Accept)"
    log "2. Promtail:    SENDING LOGS -> $LOKI_URL"
    log "3. Node Exp:    EXPOSING METRICS -> :9100"
    log "---------------------------------------------------"
}

main "$@"
