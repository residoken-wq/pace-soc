#!/bin/bash
# ==============================================
# SOC Network Scan Simulation Test
# Simulates recon activities
# ==============================================

TARGET_IP="${1:-127.0.0.1}"

echo "========================================"
echo "  SOC Network Scan Test"
echo "========================================"
echo "Target: $TARGET_IP"
echo "========================================"

if command -v nmap &> /dev/null; then
    echo "[*] Running Nmap Port Scan..."
    nmap -p 1-100 $TARGET_IP
else
    echo "⚠️  Nmap not found. Switching to Netcat scan..."
    if command -v nc &> /dev/null; then
        echo "[*] Running Netcat scan on ports 20-30..."
        nc -z -v -w 1 $TARGET_IP 20-30 2>&1
    else
        echo "❌ neither nmap nor nc found. Simulating via /dev/tcp checks..."
        for port in 22 80 443 8080; do
             (echo > /dev/tcp/$TARGET_IP/$port) >/dev/null 2>&1 && echo "Port $port is open" || echo "Port $port is closed"
        done
    fi
fi

echo ""
echo "========================================"
echo "✅ Scan Test completed!"
echo "========================================"
echo "Check Wazuh for:"
echo "- Rule: Nmap scanning detected"
echo "- MITRE T1046: Network Service Scanning"
