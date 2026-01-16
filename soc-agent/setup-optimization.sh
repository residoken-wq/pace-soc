#!/bin/bash

# 1. Optimize Wazuh Queue Size
echo "=== Optimizing Wazuh Configuration ==="
CONF_FILE="/var/ossec/etc/ossec.conf"

if [ -f "$CONF_FILE" ]; then
    cp "$CONF_FILE" "${CONF_FILE}.bak"
    
    # Check if we need to update queue_size in <global>
    if grep -q "<queue_size>" "$CONF_FILE"; then
        sed -i 's/<queue_size>[0-9]*<\/queue_size>/<queue_size>131072<\/queue_size>/g' "$CONF_FILE"
        echo "Updated queue_size to 131072"
    else
        # Primitive insert if missing (might need manual check if complex xml)
        echo "Warning: <queue_size> tag not found easily. Please ensure <global> section has <queue_size>131072</queue_size>"
    fi
    
    # Check events_per_second
    if grep -q "<events_per_second>" "$CONF_FILE"; then
         sed -i 's/<events_per_second>[0-9]*<\/events_per_second>/<events_per_second>1000<\/events_per_second>/g' "$CONF_FILE"
         echo "Updated events_per_second to 1000"
    fi

    echo "Restarting Wazuh Manager to apply changes..."
    systemctl restart wazuh-manager
else
    echo "Error: $CONF_FILE not found. Are you running this on the Wazuh Manager server?"
fi

# 2. Create Watchdog Script
echo -e "\n=== Creating Watchdog Script ==="
WATCHDOG_SCRIPT="/opt/soc-agent/wazuh-watchdog.sh"

cat << 'EOF' > "$WATCHDOG_SCRIPT"
#!/bin/bash
ALERTS_FILE="/var/ossec/logs/alerts/alerts.json"
MAX_DELAY=300 # 5 minutes
LOG_FILE="/var/log/wazuh-watchdog.log"

if [ ! -f "$ALERTS_FILE" ]; then
    echo "$(date): Alert file not found!" >> "$LOG_FILE"
    exit 1
fi

CURRENT_TIME=$(date +%s)
FILE_TIME=$(stat -c %Y "$ALERTS_FILE")
DIFF=$((CURRENT_TIME - FILE_TIME))

if [ $DIFF -gt $MAX_DELAY ]; then
    echo "$(date): ALERT STAGNATION DETECTED! Last update was $DIFF seconds ago. Restarting wazuh-manager..." >> "$LOG_FILE"
    systemctl restart wazuh-manager
    echo "$(date): Restart triggerred." >> "$LOG_FILE"
fi
EOF

chmod +x "$WATCHDOG_SCRIPT"
echo "Watchdog script created at $WATCHDOG_SCRIPT"

# 3. Add to Crontab
echo -e "\n=== Adding to Crontab ==="
JOB="*/5 * * * * $WATCHDOG_SCRIPT"
(crontab -l 2>/dev/null | grep -v "wazuh-watchdog.sh"; echo "$JOB") | crontab -
echo "Cronjob added: Runs every 5 minutes."

echo -e "\n=== Setup Complete ==="
