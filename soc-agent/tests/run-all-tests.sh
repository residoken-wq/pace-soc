#!/bin/bash
# ==============================================
# SOC Self-Test Master Script
# Runs all test modules in sequence
# ==============================================

echo "========================================"
echo "  SOC AGENT SELF-TEST SUITE"
echo "========================================"
echo "This script will execute simulated attacks"
echo "to trigger Wazuh alerts for testing."
echo "========================================"

SCRIPT_DIR="$(dirname "$0")"

# Make sure scripts are executable
chmod +x "$SCRIPT_DIR"/*.sh

echo ""
echo "1. Running File Integrity Test..."
"$SCRIPT_DIR/test-file-integrity.sh"
echo ""

echo "2. Running Network Scan Test..."
"$SCRIPT_DIR/test-network-scan.sh"
echo ""

if [ -x "$SCRIPT_DIR/test-malware.sh" ]; then
  echo "3. Running Malware Simulation..."
  "$SCRIPT_DIR/test-malware.sh"
  echo ""
else
  echo "3. Malware Simulation skipped: test-malware.sh is not installed."
  echo ""
fi

echo "4. Running Web Attack Simulation..."
"$SCRIPT_DIR/test-web-attack.sh"
echo ""

echo "5. Running Brute-force Simulation..."
"$SCRIPT_DIR/test-bruteforce.sh" "127.0.0.1" 3
echo ""

echo "6. Running Privilege Escalation Simulation..."
"$SCRIPT_DIR/test-privilege-escalation.sh"
echo ""

echo "========================================"
echo "✅ ALL TESTS COMPLETED"
echo "========================================"
