#!/bin/bash
set -e

# Wait a moment for network to be fully ready
sleep 2

echo "Configuring Wazuh Agent..."

# Update Wazuh Manager IP in ossec.conf if provided
if [ -n "$WAZUH_MANAGER" ]; then
    echo "Setting Manager IP to: $WAZUH_MANAGER"
    sed -i "s/<address>.*<\/address>/<address>${WAZUH_MANAGER}<\/address>/g" /var/ossec/etc/ossec.conf
fi

# Update Agent Name if provided
if [ -n "$WAZUH_AGENT_NAME" ]; then
     echo "Setting Agent Name to: $WAZUH_AGENT_NAME"
     sed -i "s/<client_name>.*<\/client_name>/<client_name>${WAZUH_AGENT_NAME}<\/client_name>/g" /var/ossec/etc/ossec.conf || true
     # Note: If <client_name> doesn't exist, this might not add it. Depending on Wazuh version, client name is auto-generated or set via env vars during agent-auth.
fi

echo "Starting Wazuh Agent..."
service wazuh-agent start

# Ensure the log file exists before tailing, preventing the container from crashing
touch /var/ossec/logs/ossec.log
chmod 640 /var/ossec/logs/ossec.log

echo "Tailing ossec.log to keep container alive..."
tail -f /var/ossec/logs/ossec.log
