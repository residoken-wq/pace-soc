#!/bin/bash
# Agent Metrics Setup Script
# Run this on each Wazuh agent to enable metrics collection

set -e

WAZUH_DIR="/var/ossec"
CONFIG_FILE="${WAZUH_DIR}/etc/ossec.conf"

echo "========================================"
echo "  SOC Agent Metrics Setup"
echo "========================================"

# Step 1: Create metrics collector script
echo ""
echo "[1/3] Creating metrics collector script..."
cat > "${WAZUH_DIR}/wodles/metrics-collector.sh" << 'SCRIPT'
#!/bin/bash
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}' 2>/dev/null)
if [ -z "$CPU" ] || [ "$CPU" == "100" ]; then
    CPU=$(awk '/^cpu / {usage=100-($5*100/($2+$3+$4+$5+$6+$7+$8))} END {printf "%.1f", usage}' /proc/stat 2>/dev/null || echo "0")
fi
MEM=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100}' 2>/dev/null || echo "0")
DISK=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%' 2>/dev/null || echo "0")
HOSTNAME=$(hostname)
echo "{\"soc_metrics\":{\"hostname\":\"$HOSTNAME\",\"cpu\":$CPU,\"memory\":$MEM,\"storage\":$DISK,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"
SCRIPT

chmod +x "${WAZUH_DIR}/wodles/metrics-collector.sh"
echo "  ✓ Script created at ${WAZUH_DIR}/wodles/metrics-collector.sh"

# Step 2: Test the script
echo ""
echo "[2/3] Testing metrics collector..."
${WAZUH_DIR}/wodles/metrics-collector.sh
echo "  ✓ Script works!"

# Step 3: Add wodle to config if not exists
echo ""
echo "[3/3] Configuring wodle..."

if grep -q "soc-metrics" "${CONFIG_FILE}"; then
    echo "  ⚠ Wodle already configured, skipping..."
else
    # Backup config
    cp "${CONFIG_FILE}" "${CONFIG_FILE}.bak"
    
    # Add wodle before closing </ossec_config>
    sed -i '/<\/ossec_config>/i \
  <wodle name="command">\
    <disabled>no<\/disabled>\
    <tag>soc-metrics<\/tag>\
    <command>\/var\/ossec\/wodles\/metrics-collector.sh<\/command>\
    <interval>1m<\/interval>\
    <run_on_start>yes<\/run_on_start>\
    <timeout>30<\/timeout>\
  <\/wodle>' "${CONFIG_FILE}"
    
    echo "  ✓ Wodle added to ${CONFIG_FILE}"
fi

# Step 4: Restart agent
echo ""
echo "Restarting Wazuh agent..."
systemctl restart wazuh-agent

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Verify with: tail -f ${WAZUH_DIR}/logs/ossec.log"
echo "Check for: soc-metrics tag in log output"
