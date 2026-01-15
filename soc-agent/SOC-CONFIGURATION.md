# SOC Manager Configuration Guide

## 📋 Overview

| Component | Internal URL | Public URL | Port |
|-----------|-------------|------------|------|
| **SOC Dashboard** | http://192.168.1.206:8080 | https://soc.pace.edu.vn | 8080 |
| **Wazuh Dashboard** | https://192.168.1.206:8443 | - | 8443 |
| **Wazuh API** | https://192.168.1.206:55000 | - | 55000 |
| **Wazuh Manager** | 192.168.1.206:1514/1515 | - | 1514, 1515 |

---

## 🔐 Credentials

### Wazuh API
- **User:** `wazuh-wui`
- **Password:** `kP+cJvIn1LQ6*MruHQNYfv.REn68RKP1`

### Wazuh Dashboard (https://192.168.1.206:8443)
- **User:** `admin`
- **Password:** *(check during installation or in wazuh config)*

---

## 🌐 Nginx Proxy Manager Configuration

### SOC Dashboard (soc.pace.edu.vn)
| Setting | Value |
|---------|-------|
| Domain Names | soc.pace.edu.vn |
| Scheme | http |
| Forward Hostname/IP | 192.168.1.206 |
| Forward Port | 8080 |
| Websockets Support | ✅ Enabled |
| Cache Assets | ✅ Enabled |
| Block Common Exploits | ✅ Enabled |

---

## 🖥️ Wazuh Manager Ports

| Port | Protocol | Service | Description |
|------|----------|---------|-------------|
| 1514 | TCP/UDP | wazuh-remoted | Agent data reception |
| 1515 | TCP | wazuh-authd | Agent registration |
| 1516 | TCP | wazuh-clusterd | Cluster communication |
| 55000 | TCP | wazuh-api | RESTful API (HTTPS) |
| 8443 | TCP | wazuh-dashboard | Web GUI (HTTPS) |
| 9200 | TCP | wazuh-indexer | Elasticsearch API |

---

## 📦 Docker Services

### SOC Dashboard Container
```yaml
# Location: /opt/soc-agent/dashboard/docker-compose.yml
services:
  soc-dashboard:
    build: .
    ports:
      - "8080:3000"
    environment:
      - NODE_TLS_REJECT_UNAUTHORIZED=0
      - WAZUH_MANAGER_URL=https://192.168.1.206:55000
      - WAZUH_API_USER=wazuh-wui
      - WAZUH_API_PASSWORD=kP+cJvIn1LQ6*MruHQNYfv.REn68RKP1
```

---

## 🔧 Agent Configuration

### Agent ossec.conf (Linux)
```xml
<ossec_config>
  <client>
    <server>
      <address>192.168.1.206</address>
      <port>1514</port>
      <protocol>tcp</protocol>
    </server>
  </client>
</ossec_config>
```

### Common Agent Commands
```bash
# Check status
systemctl status wazuh-agent

# Restart agent
systemctl restart wazuh-agent

# View logs
tail -f /var/ossec/logs/ossec.log
```

---

## 🛠️ Manager Commands

```bash
# Check Wazuh Manager status
systemctl status wazuh-manager

# List registered agents
/var/ossec/bin/agent_control -l

# Remove agent by ID
/var/ossec/bin/manage_agents -r <AGENT_ID>

# Restart manager
systemctl restart wazuh-manager

# View logs
tail -f /var/ossec/logs/ossec.log
```

---

## 🚨 Troubleshooting

### Agent Key Already In Use
```bash
# On Manager: Remove old agent
/var/ossec/bin/manage_agents -r <AGENT_ID>
systemctl restart wazuh-manager

# On Agent: Clear keys and restart
rm -f /var/ossec/etc/client.keys
systemctl restart wazuh-agent
```

### 502/504 Gateway Error on NPM
1. Check container is running: `docker ps | grep soc`
2. Check correct port in NPM (8080, not 3000)
3. Check firewall: `ufw status`

### Invalid Group Error
Edit agent config and remove/fix invalid group:
```bash
grep -i group /var/ossec/etc/ossec.conf
# Change invalid group to "default"
systemctl restart wazuh-agent
```

---

## 📁 Important Paths

| Path | Description |
|------|-------------|
| `/opt/soc-agent/` | SOC Dashboard source code |
| `/var/ossec/etc/ossec.conf` | Wazuh configuration |
| `/var/ossec/logs/` | Wazuh logs |
| `/var/ossec/etc/client.keys` | Agent keys |
| `/usr/share/wazuh-dashboard/` | Dashboard installation |

---

# Admin user for the web user interface and Wazuh indexer. Use this u>
  indexer_username: 'admin'
  indexer_password: 'lAEg3oxh+zhrp4fM60KRQKd2euZCl7cd'

# Wazuh dashboard user for establishing the connection with Wazuh ind>
  indexer_username: 'kibanaserver'
  indexer_password: '4V4EEn4SWEZy7iHPF75*Qnh+7DfABHzO'

# Regular Dashboard user, only has read permissions to all indices an>
  indexer_username: 'kibanaro'
  indexer_password: '835A0wi*fMP5+jwCNq5c8Aqsk3daW7s4'

# Filebeat user for CRUD operations on Wazuh indices
  indexer_username: 'logstash'
  indexer_password: 'DQXNbft+w18q.KMUdQBre28cGGbWXq7.'

# User with READ access to all indices
  indexer_username: 'readall'
  indexer_password: 'w?POhksln?.fRP9*e7hP?.dwfWnIFYZd'

# User with permissions to perform snapshot and restore operations
  indexer_username: 'snapshotrestore'
  indexer_password: 'GLSMRdx?j8MT+CN.UIb.vY+?Ac6nzCFW'

# Password for wazuh API user
  api_username: 'wazuh'
  api_password: 'qGW2gSxPG2nB2AVh3.AAG.9FuUvAxJsl'

# Password for wazuh-wui API user
  api_username: 'wazuh-wui'
  api_password: 'kP+cJvIn1LQ6*MruHQNYfv.REn68RKP1'

*Last updated: 2026-01-06*
