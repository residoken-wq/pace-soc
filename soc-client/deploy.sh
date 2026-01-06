#!/bin/bash
# SOC Client Quick Deployment Script
# Pull latest from git and deploy on client machines
#
# Usage on client:
#   curl -sSL https://raw.githubusercontent.com/pace-soc/pace-soc/main/soc-client/deploy.sh | sudo bash -s -- [AGENT_NAME]
#
# Or clone and run:
#   git clone https://github.com/pace-soc/pace-soc.git
#   cd pace-soc/soc-client
#   sudo ./deploy.sh [AGENT_NAME]

set -e

WAZUH_VERSION="4.14.1"
MANAGER_IP="192.168.1.206"
AGENT_NAME="${1:-$(hostname)}"

echo "================================================"
echo "  SOC Client Deployment"
echo "  Version: ${WAZUH_VERSION}"
echo "  Manager: ${MANAGER_IP}"
echo "  Agent:   ${AGENT_NAME}"
echo "================================================"

# Detect OS
if [ -f /etc/debian_version ]; then
    OS="debian"
    PKG_MANAGER="apt"
elif [ -f /etc/redhat-release ]; then
    OS="redhat"
    PKG_MANAGER="yum"
else
    echo "❌ Unsupported OS. Use Ubuntu/Debian or CentOS/RHEL."
    exit 1
fi

echo ""
echo "[1/4] Adding Wazuh repository..."

if [ "$OS" = "debian" ]; then
    curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import 2>/dev/null && chmod 644 /usr/share/keyrings/wazuh.gpg
    echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list > /dev/null
    apt update -qq
else
    rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH
    cat > /etc/yum.repos.d/wazuh.repo << EOF
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=Wazuh repository
baseurl=https://packages.wazuh.com/4.x/yum/
protect=1
EOF
fi

echo ""
echo "[2/4] Installing Wazuh Agent ${WAZUH_VERSION}..."

if [ "$OS" = "debian" ]; then
    WAZUH_MANAGER="${MANAGER_IP}" WAZUH_AGENT_NAME="${AGENT_NAME}" apt install -y wazuh-agent=${WAZUH_VERSION}-1
else
    WAZUH_MANAGER="${MANAGER_IP}" WAZUH_AGENT_NAME="${AGENT_NAME}" yum install -y wazuh-agent-${WAZUH_VERSION}
fi

echo ""
echo "[3/4] Configuring agent..."

# Ensure ossec.conf has correct server config
cat > /var/ossec/etc/ossec.conf << EOF
<ossec_config>
  <client>
    <server>
      <address>${MANAGER_IP}</address>
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
    <config-profile>ubuntu, ubuntu22, ubuntu22.04</config-profile>
    <notify_time>10</notify_time>
    <time-reconnect>60</time-reconnect>
    <auto_restart>yes</auto_restart>
  </client>
  
  <client_buffer>
    <disabled>no</disabled>
    <queue_size>5000</queue_size>
    <events_per_second>500</events_per_second>
  </client_buffer>

  <logging>
    <log_format>plain</log_format>
  </logging>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/syslog</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>/var/log/auth.log</location>
  </localfile>

  <rootcheck>
    <disabled>no</disabled>
  </rootcheck>

  <syscheck>
    <disabled>no</disabled>
    <frequency>43200</frequency>
    <directories>/etc,/usr/bin,/usr/sbin</directories>
    <directories>/bin,/sbin,/boot</directories>
  </syscheck>

  <syscollector>
    <disabled>no</disabled>
    <interval>1h</interval>
    <hardware>yes</hardware>
    <os>yes</os>
    <network>yes</network>
    <packages>yes</packages>
    <ports>yes</ports>
    <processes>yes</processes>
  </syscollector>
</ossec_config>
EOF

echo ""
echo "[4/4] Starting Wazuh Agent..."

systemctl daemon-reload
systemctl enable wazuh-agent
systemctl restart wazuh-agent

# Wait for registration
sleep 5

echo ""
echo "================================================"
echo "  ✅ SOC Client Deployed Successfully!"
echo "================================================"
echo ""
echo "  Agent Name: ${AGENT_NAME}"
echo "  Manager:    ${MANAGER_IP}"
echo "  Status:     $(systemctl is-active wazuh-agent)"
echo ""
echo "  Useful commands:"
echo "    systemctl status wazuh-agent"
echo "    tail -f /var/ossec/logs/ossec.log"
echo "    cat /var/ossec/etc/client.keys"
echo ""
echo "================================================"
