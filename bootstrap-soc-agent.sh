#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
SOC_CENTER_IP="${SOC_CENTER_IP:-192.168.1.206}"
WAZUH_MANAGER_IP="${WAZUH_MANAGER_IP:-$SOC_CENTER_IP}"
LOKI_URL="http://${SOC_CENTER_IP}:3100/loki/api/v1/push"
SOC_DIR="/opt/soc-agent"
REPO_URL="https://github.com/pace-soc/pace-soc.git" # Update with actual repo if public/private
AGENT_NAME="$(hostname)-container"

# --- Colors & Logging ---
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
install_essential_tools() {
    log "Checking essential tools (git, curl, docker)..."
    
    local missing_tools=()
    command -v git >/dev/null 2>&1 || missing_tools+=("git")
    command -v curl >/dev/null 2>&1 || missing_tools+=("curl")
    
    if [ ${#missing_tools[@]} -eq 0 ]; then
         log "Essential tools are present."
    else
         log "Installing missing tools: ${missing_tools[*]}..."
         if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
             apt-get update -qq
             apt-get install -y "${missing_tools[@]}"
         elif [ "$OS_ID" = "centos" ] || [ "$OS_ID" = "rhel" ]; then
             yum install -y "${missing_tools[@]}"
         fi
    fi

    # Docker separate install
    if ! command -v docker >/dev/null 2>&1; then
        log "Installing Docker..."
        if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
            curl -fsSL https://get.docker.com | sh
        elif [ "$OS_ID" = "centos" ] || [ "$OS_ID" = "rhel" ]; then
             yum install -y yum-utils
             yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
             yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
             systemctl enable --now docker
        fi
    fi
}

cleanup_full() {
    log "Executing System Cleanup..."
    
    # 1. Stop and Remove Legacy Containers
    local containers=("promtail-agent" "node-exporter" "wazuh-agent" "soc-promtail" "soc-node-exporter" "soc-wazuh-agent" "soc-dashboard")
    for container in "${containers[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            warn "Removing container: $container"
            docker rm -f "$container" || true
        fi
    done

    # 2. Network Cleanup
    if docker network ls | grep -q "soc-net"; then
        warn "Removing network: soc-net"
        docker network rm soc-net || true
    fi

    # 3. Volume Cleanup (Deep Clean)
    # Only remove volumes if we want a TRULY fresh start (Lose logs/state)
    local volumes=("soc-agent_promtail-data" "soc-agent_wazuh-logs" "wazuh-logs" "promtail-data")
    for vol in "${volumes[@]}"; do
        if docker volume ls -q | grep -q "^${vol}$"; then
             warn "Removing volume: $vol"
             docker volume rm "$vol" || true
        fi
    done

    # 4. Remove Native Wazuh Agent (Host Conflict Fix)
    # The user reported dpkg errors. We must remove the host package to use the container.
    if [ -d "/var/ossec" ] || dpkg -l | grep -q wazuh-agent 2>/dev/null; then
        warn "Detected native Wazuh Agent. Purging to prevent conflicts..."
        
        # Stop service first
        systemctl stop wazuh-agent 2>/dev/null || true
        
        if [ "$OS_ID" = "ubuntu" ] || [ "$OS_ID" = "debian" ]; then
             # Force remove config files and package
             apt-get purge -y wazuh-agent || true
        elif [ "$OS_ID" = "centos" ] || [ "$OS_ID" = "rhel" ]; then
             yum remove -y wazuh-agent || true
        fi
        
        # Aggressive cleanup of the directory causing 'mv' errors
        if [ -d "/var/ossec" ]; then
            warn "Removing /var/ossec directory..."
            rm -rf /var/ossec
        fi
    fi
}

deploy_code() {
    log "Deploying SOC Agent Code..."
    mkdir -p "$SOC_DIR"
    
    # If we are running FROM the repo (local dev), just copy
    if [ -f "docker-compose.yml" ]; then
        log "Local config found. Copying to $SOC_DIR..."
        cp -v docker-compose.yml promtail.yml Dockerfile.wazuh "$SOC_DIR/"
        cp -r dashboard "$SOC_DIR/"
    else
        # If we are running as standalone script, Pull from Git
        # Note: This requires credentials if private, or public repo
        if [ ! -d "$SOC_DIR/.git" ]; then
             log "Cloning repository..."
             # git clone "$REPO_URL" "$SOC_DIR"
             warn "Git clone skipped (Repo URL placeholder). Please ensure config files are present in $SOC_DIR"
        else
             log "Updating repository..."
             # cd "$SOC_DIR" && git pull
        fi
    fi

    # Generate .env
    echo "WAZUH_MANAGER_IP=$WAZUH_MANAGER_IP" > "$SOC_DIR/.env"
    echo "AGENT_NAME=$AGENT_NAME" >> "$SOC_DIR/.env"
    
    chmod 600 "$SOC_DIR/.env"
    
    # Verification of critical files
    if [ ! -f "$SOC_DIR/Dockerfile.wazuh" ]; then
        err "CRITICAL: Dockerfile.wazuh is missing in $SOC_DIR after copy!"
        ls -l "$SOC_DIR"
        exit 1
    fi
}

start_services() {
    log "Starting SOC Stack..."
    cd "$SOC_DIR"
    
    # Ensure Docker Dashboard is built/pulled
    docker compose up -d --build --remove-orphans
    
    if docker compose ps | grep -q "Up"; then
        log "SOC Agent Stack is RUNNING."
    else
        err "Stack start failed."
    fi
}

main() {
    log ">>> SOC AGENT INSTALLER v2.0-Fix (Check for this version) <<<"
    require_root
    detect_os
    
    install_essential_tools
    cleanup_full
    deploy_code
    start_services

    log "---------------------------------------------------"
    log "Status Checking:"
    log "  Dashboard: http://$(hostname -I | awk '{print $1}'):8080"
    log "  Metrics:   http://$(hostname -I | awk '{print $1}'):9100"
    log "  Loki:      sending to $LOKI_URL"
    log "---------------------------------------------------"
}

main "$@"
