# SOC Client Deployment Package

Quick deployment scripts for Wazuh agents connecting to SOC Manager.

## 🚀 Quick Deploy

### Linux (Ubuntu/Debian/CentOS)

**One-line interactive install:**
```bash
curl -sSL https://raw.githubusercontent.com/pace-soc/pace-soc/main/soc-client/deploy.sh | sudo bash -s -- --install-tests
```
*(This installs the agent, configures it, and downloads self-test verification scripts)*

**Manual arguments:**
```bash
# Usage: ./deploy.sh [AGENT_NAME] [MANAGER_IP] [VERSION] [--install-tests]
sudo ./deploy.sh MyServer 192.168.1.206 4.14.1 --install-tests
```

### Windows (PowerShell)

Run as **Administrator**:

```powershell
.\deploy-windows.ps1 -AgentName "MyWorkstation" -ManagerIP "192.168.1.206" -InstallTests
```

## 📋 Configuration Defaults

| Setting | Default Value | Description |
|---------|---------------|-------------|
| Wazuh Version | 4.14.1 | Agent version to install |
| Manager IP | 192.168.1.206 | SOC Center IP |
| Protocol | TCP | Communication protocol |
| Port | 1514 | Agent connection port |

## 🧪 Self-Test Scripts

If you include `--install-tests` (Linux) or `-InstallTests` (Windows), the scripts will be downloaded to:
- **Linux**: `/opt/soc-agent/tests/`
- **Windows**: `C:\soc-agent\tests\`

Use these to simulate attacks and verify SOC detection.

## 📁 Files

| File | Description |
|------|-------------|
| `deploy.sh` | Main deployment script (Linux) |
| `deploy-windows.ps1` | Windows deployment script |
| `fix-ssl-issues.sh` | Helper for legacy system SSL problems |

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
| Agent not connecting | Check firewall: `ufw allow 1514/tcp` on Manager |
| Key conflict | On manager: `/var/ossec/bin/manage_agents -r ID` |
| Service not starting | Check logs: `/var/ossec/logs/ossec.log` |
| GitHub Download Failure | Ensure client has internet access to `raw.githubusercontent.com` |
