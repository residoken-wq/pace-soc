#!/bin/bash
# =============================================================================
# SOC Agent SSL Fix Script
# Fixes SSL certificate issues for Docker and Node Exporter on Wazuh agents
# Run as root on affected agents (web-srv-01, atm-01, etc.)
# =============================================================================

set -e

echo "============================================"
echo "  SOC Agent SSL Certificate Fix"
echo "============================================"

# Detect current hostname and IP
HOSTNAME=$(hostname)
IP=$(hostname -I | awk '{print $1}')
echo "Host: $HOSTNAME ($IP)"
echo ""

# === FIX 1: Docker Insecure Registry ===
fix_docker_ssl() {
    echo "[1/3] Checking Docker configuration..."
    
    DOCKER_CONFIG="/etc/docker/daemon.json"
    
    # Create or update daemon.json
    if [ -f "$DOCKER_CONFIG" ]; then
        echo "  Found existing Docker config, backing up..."
        cp "$DOCKER_CONFIG" "${DOCKER_CONFIG}.bak"
        
        # Check if insecure-registries already exists
        if grep -q "insecure-registries" "$DOCKER_CONFIG"; then
            echo "  ⚠ insecure-registries already configured, skipping..."
        else
            echo "  Adding insecure-registries..."
            # Use jq if available, otherwise manual edit
            if command -v jq &> /dev/null; then
                jq '. + {"insecure-registries": ["192.168.1.206:5000", "registry.local:5000"]}' "$DOCKER_CONFIG" > /tmp/daemon.json
                mv /tmp/daemon.json "$DOCKER_CONFIG"
            else
                echo '{"insecure-registries": ["192.168.1.206:5000", "registry.local:5000"]}' > "$DOCKER_CONFIG"
            fi
        fi
    else
        echo "  Creating new Docker config..."
        cat > "$DOCKER_CONFIG" << 'EOF'
{
  "insecure-registries": ["192.168.1.206:5000", "registry.local:5000"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
    fi
    
    echo "  Restarting Docker..."
    systemctl restart docker 2>/dev/null || service docker restart 2>/dev/null || true
    echo "  ✓ Docker SSL fix applied"
}

# === FIX 2: Node Exporter (usually HTTP, check if HTTPS misconfigured) ===
fix_node_exporter() {
    echo ""
    echo "[2/3] Checking Node Exporter configuration..."
    
    NE_SERVICE="/etc/systemd/system/node_exporter.service"
    NE_DEFAULT="/etc/default/node_exporter"
    
    # Check if node_exporter is running with HTTPS (shouldn't be by default)
    if systemctl is-active --quiet node_exporter 2>/dev/null; then
        echo "  Node Exporter is running"
        
        # Check command line args
        ARGS=$(ps aux | grep node_exporter | grep -v grep | head -1)
        if echo "$ARGS" | grep -q "tls"; then
            echo "  ⚠ Node Exporter is using TLS, this may cause issues"
            echo "  Consider disabling TLS or configuring proper certificates"
        else
            echo "  ✓ Node Exporter is using HTTP (correct)"
        fi
    else
        echo "  Node Exporter not found or not running"
    fi
}

# === FIX 3: Update CA Certificates ===
update_ca_certs() {
    echo ""
    echo "[3/3] Updating system CA certificates..."
    
    # Add SOC Manager CA if exists
    SOC_CA="/tmp/soc-manager-ca.crt"
    
    if [ -f "$SOC_CA" ]; then
        echo "  Installing SOC Manager CA certificate..."
        cp "$SOC_CA" /usr/local/share/ca-certificates/soc-manager-ca.crt
        update-ca-certificates 2>/dev/null || true
        echo "  ✓ CA certificate installed"
    else
        echo "  No custom CA certificate found, skipping..."
        echo "  (To install, place CA at $SOC_CA and re-run)"
    fi
    
    # Update system certs anyway
    update-ca-certificates 2>/dev/null || yum update ca-certificates 2>/dev/null || true
    echo "  ✓ System CA certificates updated"
}

# === MAIN ===
echo ""
fix_docker_ssl
fix_node_exporter
update_ca_certs

echo ""
echo "============================================"
echo "  SSL Fix Complete!"
echo "============================================"
echo ""
echo "Recommended next steps:"
echo "  1. Verify Docker: docker pull hello-world"
echo "  2. Check Node Exporter: curl http://localhost:9100/metrics"
echo "  3. Restart Wazuh Agent: systemctl restart wazuh-agent"
echo ""
