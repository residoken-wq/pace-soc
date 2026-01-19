#!/bin/bash
# ==============================================
# SOC Web Attack Simulation Test
# Simulates SQLi, XSS, and Common Web Attacks
# ==============================================

TARGET_URL="${1:-http://localhost}"

echo "========================================"
echo "  SOC Web Attack Test"
echo "========================================"
echo "Target: $TARGET_URL"
echo "========================================"

if ! command -v curl &> /dev/null; then
    echo "❌ Error: curl is not installed."
    exit 1
fi

echo "[*] Simulating SQL Injection..."
curl -s -o /dev/null "$TARGET_URL/login.php?user=admin' OR '1'='1"
echo "Executed SQLi request."

echo "[*] Simulating XSS Attack..."
curl -s -o /dev/null "$TARGET_URL/search.php?q=<script>alert('xss')</script>"
echo "Executed XSS request."

echo "[*] Simulating Directory Traversal..."
curl -s -o /dev/null "$TARGET_URL/../../../../etc/passwd"
echo "Executed Dir Traversal request."

echo "[*] Simulating Shellshock..."
curl -s -o /dev/null -H "User-Agent: () { :; }; /bin/eject" "$TARGET_URL/cgi-bin/test.cgi"
echo "Executed Shellshock request."

echo ""
echo "========================================"
echo "✅ Web Attack Test completed!"
echo "========================================"
echo "Check Wazuh for:"
echo "- Rule 31101: Web attack SQL injection"
echo "- Rule 31103: Web attack XSS"
echo "- MITRE T1190: Exploit Public-Facing Application"
