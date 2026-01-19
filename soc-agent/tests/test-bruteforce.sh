#!/bin/bash
# ==============================================
# SOC Brute-force Test Script
# Simulates SSH brute-force attack for testing
# ==============================================

TARGET_IP="${1:-127.0.0.1}"
ATTEMPTS="${2:-5}"
DELAY="${3:-1}"

echo "========================================"
echo "  SOC Brute-force Test"
echo "========================================"
echo "Target: $TARGET_IP"
echo "Attempts: $ATTEMPTS"
echo "========================================"

echo "⚠️  This will generate FAILED SSH login attempts"

for i in $(seq 1 $ATTEMPTS); do
    echo "[$i/$ATTEMPTS] Attempting SSH with invalid user..."
    
    # Attempt SSH with fake credentials (will fail)
    # Using timeout and BatchMode to prevent hanging
    if command -v sshpass &> /dev/null; then
        timeout 2 sshpass -p 'wrongpassword123' ssh -o BatchMode=no \
            -o StrictHostKeyChecking=no \
            -o ConnectTimeout=2 \
            -o UserKnownHostsFile=/dev/null \
            "fakeuser_attack_$i@$TARGET_IP" exit 2>/dev/null
    else
        # Use expect-less method if sshpass missing
        timeout 2 ssh -o BatchMode=yes \
            -o StrictHostKeyChecking=no \
            -o ConnectTimeout=2 \
            -o UserKnownHostsFile=/dev/null \
            "fakeuser_attack_$i@$TARGET_IP" exit 2>/dev/null
    fi
    
    sleep $DELAY
done

echo ""
echo "========================================"
echo "✅ Brute-force Test completed!"
echo "========================================"
echo "Check Wazuh for:"
echo "- Rule 5710: Failed SSH password"
echo "- Rule 5716: SSH authentication failed"
echo "- Rule 100300: SOC Brute-force detection"
echo "- MITRE T1110: Brute Force"
