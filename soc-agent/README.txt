SOC Agent Pack
=================================

Description:
------------
This pack contains the necessary components to deploy the SOC Agent (Promtail, Node Exporter, Wazuh Agent) on a Linux server.

- bootstrap-soc-agent.sh: Automated installer script.
- docker-compose.yml: Runs Promtail and Node Exporter.
- promtail.yml: Configures log collection and parsing.

Installation Usage:
-------------------
1. Copy this entire folder to the target machine (e.g., /tmp/soc-agent or /opt/soc-agent).
   Example: scp -r soc-agent root@target:/opt/

2. Run the bootstrap script as root:
   cd /opt/soc-agent
   sudo chmod +x bootstrap-soc-agent.sh
   sudo ./bootstrap-soc-agent.sh

3. Verification:
   - Check if standard services are running: docker ps
   - Check Wazuh agent status: systemctl status wazuh-agent
   - Go to Wazuh Dashboard to ACCEPT the new agent.

Requirements:
-------------
- OS: Ubuntu 20/22/24, CentOS 7/8/9
- Root privileges
- Outbound connectivity to 192.168.1.206 on ports 3100, 1514, 1515.

TROUBLESHOOTING & TESTING
=========================

1. Check SSH Logging (If Brute Force alerts are missing):
   Wazuh Agent reads logs from /var/log/auth.log. If rsyslog is missing, this file might be empty.
   
   Verify auth.log has data:
   tail -f /var/log/auth.log
   
   If empty/missing, install rsyslog:
   sudo apt-get update && sudo apt-get install -y rsyslog
   sudo systemctl enable --now rsyslog

2. Manual Brute Force Test on Client:
   You can generate a test log entry manually to verify connectivity:
   
   logger -t sshd "Failed password for invalid user hacker from 1.2.3.4 port 55555 ssh2"
   
   Then check Wazuh Dashboard for "SSHD: Failed login" alert.

3. Restart Agent:
   If config changes are made:
   sudo systemctl restart wazuh-agent

4. Run Brute Force Simulation from SOC Manager:
   If you have access to the SOC Manager server, you can run the simulation script against this agent:
   
   cd /opt/soc-agent/soc-agent/tests
   ./test-bruteforce.sh <AGENT_IP> 10 1
   
   Example:
   ./test-bruteforce.sh 192.168.0.195 10 1
   
   (This attempts 10 SSH logins with invalid users, 1 second apart)
