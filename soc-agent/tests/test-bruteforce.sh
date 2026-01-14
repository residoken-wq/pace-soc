#!/bin/bash
# ==============================================
# SOC Brute-force Test Script
# Simulates SSH brute-force attack for testing
# ==============================================

TARGET_IP="${1:-192.168.0.195}"
ATTEMPTS="${2:-10}"
DELAY="${3:-1}"

echo "========================================"
echo "  SOC Brute-force Test"
echo "========================================"
echo "Target: $TARGET_IP"
echo "Attempts: $ATTEMPTS"
echo "Delay: ${DELAY}s between attempts"
echo "========================================"
echo ""
echo "⚠️  This will generate FAILED SSH login attempts"
echo "    Wazuh should detect and alert on these"
echo ""
read -p "Press ENTER to start test or Ctrl+C to cancel..."

echo ""
echo "Starting brute-force simulation..."
echo ""

for i in $(seq 1 $ATTEMPTS); do
    echo "[$i/$ATTEMPTS] Attempting SSH with invalid user..."
    
    # Attempt SSH with fake credentials (will fail)
    # Using timeout and BatchMode to prevent hanging
    timeout 3 sshpass -p 'wrongpassword123' ssh -o BatchMode=no \
        -o StrictHostKeyChecking=no \
        -o ConnectTimeout=2 \
        -o UserKnownHostsFile=/dev/null \
        "fakeuser_attack_$i@$TARGET_IP" exit 2>/dev/null
    
    # Alternative if sshpass not installed
    if [ $? -eq 127 ]; then
        # Use expect-less method
        timeout 3 ssh -o BatchMode=yes \
            -o StrictHostKeyChecking=no \
            -o ConnectTimeout=2 \
            -o UserKnownHostsFile=/dev/null \
            "invalid_user_$i@$TARGET_IP" 2>/dev/null
    fi
    
    sleep $DELAY
done

echo ""
echo "========================================"
echo "✅ Test completed!"
echo "========================================"
echo ""
echo "Check the following:"
echo "1. SOC Dashboard -> Alerts page"
echo "2. SOC Dashboard -> Live Attack Feed"
echo "3. Wazuh Manager logs:"
echo "   tail -f /var/ossec/logs/alerts/alerts.log"
echo ""
echo "Expected alerts:"
echo "- Rule 5710: Failed SSH password"
echo "- Rule 5716: SSH authentication failed"
echo "- Rule 100300: SOC Brute-force detection"
echo ""
