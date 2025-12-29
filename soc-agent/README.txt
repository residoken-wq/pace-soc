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
