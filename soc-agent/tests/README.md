# SOC Agent Self-Test Suite

This directory contains scripts to simulate various security events on Linux agents to verify Wazuh detection capabilities and trigger MITRE ATT&CK alerts.

## Included Tests

| Script | Description | MITRE Technique |
|--------|-------------|-----------------|
| `test-bruteforce.sh` | Simulates SSH brute-force attacks | T1110 (Brute Force) |
| `test-file-integrity.sh` | Modifies monitored files / sensitive files | T1003 (OS Credential Dumping), T1070 |
| `test-malware.sh` | Drops EICAR test file | T1204 (User Execution) |
| `test-network-scan.sh` | Runs port scans using Nmap/Netcat | T1046 (Network Service Scanning) |
| `test-privilege-escalation.sh` | Simulates sudo abuse and SUID recon | T1548 (Abuse Elevation Control) |
| `test-web-attack.sh` | Simulates SQLi, XSS, Shellshock | T1190 (Exploit Public-Facing App) |

## Usage

1.  **Copy scripts to client machine**:
    Copy the `tests` folder to the Linux agent you want to test.

    ```bash
    scp -r tests user@client:/tmp/
    ```

2.  **Make executable**:
    ```bash
    chmod +x /tmp/tests/*.sh
    ```

3.  **Run Master Script**:
    ```bash
    cd /tmp/tests
    ./run-all-tests.sh
    ```

4.  **Run Individual Scripts**:
    You can run any script individually. Some may accept arguments (like target IP).
    ```bash
    ./test-bruteforce.sh 192.168.1.10
    ```

## Requirements
- `sshpass` (optional, for better brute-force simulation)
- `nmap` or `netcat` (optional, for scanning)
- `curl` (for web attacks)
- `sudo` access (for privilege escalation tests)
