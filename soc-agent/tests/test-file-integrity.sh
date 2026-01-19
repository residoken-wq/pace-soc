#!/bin/bash
# ==============================================
# SOC File Integrity Monitoring (FIM) Test
# Simulates suspicious file modifications
# ==============================================

TARGET_FILE="/etc/hosts"
BACKUP_FILE="/tmp/hosts.bak"
TEST_COMMENT="# SOC_TEST_ENTRY_DO_NOT_REMOVE"

echo "========================================"
echo "  SOC File Integrity Test"
echo "========================================"
echo "Target: $TARGET_FILE"
echo "Action: Appending suspicious entry"
echo "========================================"

if [ ! -w "$TARGET_FILE" ]; then
    echo "❌ Error: Cannot write to $TARGET_FILE. Run as root/sudo."
    exit 1
fi

echo "[*] Backing up $TARGET_FILE..."
cp $TARGET_FILE $BACKUP_FILE

echo "[*] Modifying $TARGET_FILE..."
echo "$TEST_COMMENT" >> $TARGET_FILE
echo "127.0.0.1   malicious-site.test" >> $TARGET_FILE

echo "✅ Modification complete. Walking for 5 seconds..."
sleep 5

echo "[*] Reverting changes..."
# Restore from backup to be safe
cp $BACKUP_FILE $TARGET_FILE
rm $BACKUP_FILE

echo "✅ Reverted changes."

# Also touch a sensitive file to trigger access time alerts if configured
echo "[*] Accessing /etc/shadow (Read attempt)..."
cat /etc/shadow > /dev/null 2>&1

# Create a file in /bin (Simulating dropping a binary)
echo "[*] creating a test file in /bin (Simulating binary drop)..."
touch /bin/soc-test-binary
sleep 2
rm /bin/soc-test-binary

echo ""
echo "========================================"
echo "✅ FIM Test completed!"
echo "========================================"
echo "Check Wazuh for:"
echo "- Rule 550: Integrity checksum changed"
echo "- MITRE T1003: Credential Dumping"
echo "- MITRE T1070: Indicator Removal on Host"
