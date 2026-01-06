# SOC Client Deployment Package

Quick deployment scripts for Wazuh agents connecting to SOC Manager.

## 🚀 Quick Deploy (One-liner)

### Linux (Ubuntu/Debian/CentOS)
```bash
curl -sSL https://raw.githubusercontent.com/pace-soc/pace-soc/main/soc-client/deploy.sh | sudo bash -s -- MyAgentName
```

### From Git Clone
```bash
git clone https://github.com/pace-soc/pace-soc.git
cd pace-soc/soc-client
sudo ./deploy.sh MyAgentName
```

## 📋 Configuration

| Setting | Value |
|---------|-------|
| Wazuh Version | 4.14.1 |
| Manager IP | 192.168.1.206 |
| Agent Port | 1514 (TCP) |
| Registration Port | 1515 |

## 📁 Files

| File | Description |
|------|-------------|
| `deploy.sh` | Main deployment script (Linux) |
| `deploy-windows.ps1` | Windows deployment script |

## ✅ Verification

After deployment, verify agent is connected:

```bash
# Check agent status
systemctl status wazuh-agent

# View agent key (should not be empty)
cat /var/ossec/etc/client.keys

# Check logs for connection
tail -20 /var/ossec/logs/ossec.log
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent not connecting | Check firewall: `ufw allow 1514/tcp` |
| Key conflict | On manager: `/var/ossec/bin/manage_agents -r ID` |
| Service not starting | Check logs: `/var/ossec/logs/ossec.log` |

## 🔄 Update Agent

```bash
cd pace-soc
git pull
sudo ./soc-client/deploy.sh
```
