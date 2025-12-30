#!/bin/bash
# SOC Agent Metrics Collector
# Collects CPU, RAM, Storage metrics and outputs as JSON for Wazuh Command Monitoring

# Get CPU usage (100 - idle%)
CPU=$(top -bn1 | grep "Cpu(s)" | awk '{print 100 - $8}' 2>/dev/null)
if [ -z "$CPU" ] || [ "$CPU" == "100" ]; then
    # Alternative method using /proc/stat
    CPU=$(awk '/^cpu / {usage=100-($5*100/($2+$3+$4+$5+$6+$7+$8))} END {printf "%.1f", usage}' /proc/stat 2>/dev/null || echo "0")
fi

# Get Memory usage percentage
MEM=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100}' 2>/dev/null || echo "0")

# Get Root disk usage percentage
DISK=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%' 2>/dev/null || echo "0")

# Get hostname for identification
HOSTNAME=$(hostname)

# Output as JSON (Wazuh will parse this)
echo "{\"soc_metrics\":{\"hostname\":\"$HOSTNAME\",\"cpu\":$CPU,\"memory\":$MEM,\"storage\":$DISK,\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"
