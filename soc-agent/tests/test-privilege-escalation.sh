#!/bin/bash
# ==============================================
# SOC Privilege Escalation Test
# Simulates sudo abuse and unauthorized access
# ==============================================

echo "========================================"
echo "  SOC Privilege Escalation Test"
echo "========================================"

# 1. Failed Sudo Attempt
echo "[*] Simulating failed sudo attempt..."
# We try to sudo a command with a non-existent user or just fail auth
# If we are root, this might not work as expected, so we switch to nobody if possible
if [ "$EUID" -eq 0 ]; then 
    echo "Running as root, switching to 'nobody' for failed sudo test..."
    su -s /bin/bash nobody -c "sudo -n ls /root 2>/dev/null"
else
    sudo -n ls /root 2>/dev/null
fi

# 2. SUID Binary Search (common recon technique)
echo "[*] Simulating SUID binary recon (T1087)..."
find / -perm -4000 2>/dev/null | head -n 5

# 3. Accessing sensitive files
echo "[*] Attempting to read /etc/shadow..."
cat /etc/shadow 2>/dev/null

echo ""
echo "========================================"
echo "✅ PrivEsc Test completed!"
echo "========================================"
echo "Check Wazuh for:"
echo "- Rule 5402: Successful sudo to ROOT executed"
echo "- Rule 5603: Threat detected in sudo log"
echo "- MITRE T1548: Abuse Elevation Control Mechanism"
