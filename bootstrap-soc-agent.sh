#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SOC_CENTER_IP="${SOC_CENTER_IP:-192.168.1.206}"
WAZUH_MANAGER_IP="${WAZUH_MANAGER_IP:-$SOC_CENTER_IP}"
LOKI_URL="http://${SOC_CENTER_IP}:3100/loki/api/v1/push"
SOC_DIR="/opt/soc-agent"
AGENT_NAME="$(hostname)-container"

# --- Colors & Logging ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[SOC-AGENT]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
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

cleanup_old_containers() {
    log "Checking for legacy containers to clean up..."
    # List of known legacy or current container names to reset
    local containers=("promtail-agent" "node-exporter" "wazuh-agent" "soc-promtail" "soc-node-exporter" "soc-wazuh-agent")
    
    for container in "${containers[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            warn "Removing existing container: $container"
            docker rm -f "$container" || true
        fi
    done
}

setup_soc_dir() {
    log "Setting up SOC Directory at $SOC_DIR..."
    mkdir -p "$SOC_DIR"

    # Copy config files
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
    
    # Generate .env file for Docker Compose
    echo "WAZUH_MANAGER_IP=$WAZUH_MANAGER_IP" > "$SOC_DIR/.env"
    echo "AGENT_NAME=$AGENT_NAME" >> "$SOC_DIR/.env"
    
    # Set permissions (Security)
    chmod 600 "$SOC_DIR/promtail.yml"
    chmod 600 "$SOC_DIR/docker-compose.yml"
    chmod 600 "$SOC_DIR/.env"
}

start_services() {
    log "Starting SOC Agent Containers..."
    cd "$SOC_DIR"
    
    # Pull latest images
    docker compose pull
    
    # Start services
    docker compose up -d
    
    # Verification
    if docker compose ps | grep -q "Up"; then
        log "Services are running successfully."
    else
        err "Failed to start services. Check 'docker compose logs'."
    fi
}

main() {
    log "Starting SOC Agent Bootstrap (Containerized Mode)..."
    require_root
    detect_os
    
    install_docker
    cleanup_old_containers
    
    setup_soc_dir
    start_services

    log "---------------------------------------------------"
    log "Installation Complete!"
    log "1. Wazuh Agent:  ACTIVE (Container: soc-wazuh-agent)"
    log "                 * Verify in Wazuh Manager: $WAZUH_MANAGER_IP"
    log "2. Promtail:     SENDING LOGS -> $LOKI_URL"
    log "3. Node Exp:     EXPOSING METRICS -> :9100"
    log "---------------------------------------------------"
}

main "$@"
