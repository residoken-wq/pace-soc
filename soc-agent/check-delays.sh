#!/bin/bash

echo "=== 1. Checking Wazuh Manager Flood/Rate Limiting ==="
if [ -f /var/ossec/logs/ossec.log ]; then
    grep -iE "flood|bucket|limit|drop|leaky" /var/ossec/logs/ossec.log | tail -20
else
    echo "Warning: /var/ossec/logs/ossec.log not found directly. Checking inside container if applicable."
    # Try docker logs if running in container
    docker logs soc-wazuh.manager 2>&1 | grep -iE "flood|bucket|limit|drop|leaky" | tail -20
fi

echo -e "\n=== 2. Checking Filebeat Lag/Errors ==="
if systemctl is-active --quiet filebeat; then
    # Check for Harvester errors or lagging
    grep -iE "error|fail|lag|backoff" /var/log/filebeat/filebeat | tail -20
    
    # Check registry updated time (to see if it's stuck)
    stat /var/lib/filebeat/registry/filebeat/log.json
else
    echo "Filebeat service not found or active. Checking docker..."
fi

echo -e "\n=== 3. Checking Wazuh Indexer Health & Queue ==="
# Check cluster health and pending tasks
curl -k -u admin:${WAZUH_INDEXER_PASSWORD:-admin} -X GET "https://127.0.0.1:9200/_cluster/health?pretty"

echo -e "\n=== 4. System Time & Timezone Check ==="
echo "System Date: $(date)"
echo "Wazuh Alert File Last Mod: $(stat -c %y /var/ossec/logs/alerts/alerts.json 2>/dev/null || echo 'Not found')"

echo -e "\n=== 5. Checking recent alerts in alerts.json ==="
# Show last 5 alerts timestamps to compare with current time
tail -n 5 /var/ossec/logs/alerts/alerts.json | grep "timestamp" 2>/dev/null
