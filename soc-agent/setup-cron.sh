#!/bin/bash

# SOC Dashboard - Setup Email Alert Cronjob
# This script configures a cron job to run the alert mailer script inside the Docker container.

CRON_FILE="/etc/cron.d/soc-alert-mailer"
LOG_FILE="/var/log/soc-alert-mailer.log"

echo "Configuring SOC Email Alert Cronjob..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

# Create Cron file
# Runs every 10 minutes
echo "*/10 * * * * root docker exec soc-dashboard node scripts/mail-alert.js >> $LOG_FILE 2>&1" > "$CRON_FILE"

# Set permissions
chmod 644 "$CRON_FILE"

# Create log file if not exists
touch "$LOG_FILE"
chmod 666 "$LOG_FILE"

echo "✅ Cronjob created at $CRON_FILE"
echo "   - Schedule: Every 10 minutes"
echo "   - Command: docker exec soc-dashboard node scripts/mail-alert.js"
echo "   - Log: $LOG_FILE"
echo ""
echo "Test run:"
docker exec soc-dashboard node scripts/mail-alert.js
