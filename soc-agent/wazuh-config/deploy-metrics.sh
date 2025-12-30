#!/bin/bash
# SOC Metrics Deployment Script
# Run this script on Wazuh Manager to deploy metrics collection

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WAZUH_DIR="/var/ossec"

echo "========================================"
echo "  SOC Metrics Deployment"
echo "========================================"

# Step 1: Deploy decoder to Manager
echo ""
echo "[1/4] Deploying decoder to Wazuh Manager..."
if [ -f "${SCRIPT_DIR}/soc_metrics_decoder.xml" ]; then
    cp "${SCRIPT_DIR}/soc_metrics_decoder.xml" "${WAZUH_DIR}/etc/decoders/"
    chown wazuh:wazuh "${WAZUH_DIR}/etc/decoders/soc_metrics_decoder.xml"
    chmod 640 "${WAZUH_DIR}/etc/decoders/soc_metrics_decoder.xml"
    echo "  ✓ Decoder deployed"
else
    echo "  ✗ Decoder file not found!"
fi

# Step 2: Deploy rules to Manager
echo ""
echo "[2/4] Deploying rules to Wazuh Manager..."
if [ -f "${SCRIPT_DIR}/soc_metrics_rules.xml" ]; then
    cp "${SCRIPT_DIR}/soc_metrics_rules.xml" "${WAZUH_DIR}/etc/rules/"
    chown wazuh:wazuh "${WAZUH_DIR}/etc/rules/soc_metrics_rules.xml"
    chmod 640 "${WAZUH_DIR}/etc/rules/soc_metrics_rules.xml"
    echo "  ✓ Rules deployed"
else
    echo "  ✗ Rules file not found!"
fi

# Step 3: Restart Wazuh Manager
echo ""
echo "[3/4] Restarting Wazuh Manager..."
systemctl restart wazuh-manager
echo "  ✓ Manager restarted"

# Step 4: Print agent setup instructions
echo ""
echo "[4/4] Agent Setup Instructions"
echo "========================================"
echo ""
echo "Run these commands on EACH agent:"
echo ""
echo "# 1. Copy metrics script"
echo "cat > ${WAZUH_DIR}/wodles/metrics-collector.sh << 'EOF'"
cat "${SCRIPT_DIR}/metrics-collector.sh"
echo "EOF"
echo ""
echo "chmod +x ${WAZUH_DIR}/wodles/metrics-collector.sh"
echo ""
echo "# 2. Add wodle to ossec.conf (inside <ossec_config> tag)"
echo "# Copy content from: ${SCRIPT_DIR}/agent_wodle_config.xml"
echo ""
echo "# 3. Restart agent"
echo "systemctl restart wazuh-agent"
echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "Verify metrics are being collected:"
echo "  tail -f ${WAZUH_DIR}/logs/alerts/alerts.json | grep soc_metrics"
