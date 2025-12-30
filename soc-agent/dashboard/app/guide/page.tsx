"use client";

import React from 'react';
import Navbar from '../../components/Navbar';
import { Book, Terminal, Download, Server, CheckCircle, ArrowRight, Copy, ExternalLink } from 'lucide-react';

export default function GuidePage() {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Book className="w-6 h-6 text-emerald-400" />
                        Wazuh Agent Installation Guide
                    </h2>
                    <p className="text-slate-400">Step-by-step guide to install and configure Wazuh agents</p>
                </div>

                {/* Prerequisites */}
                <Section title="Prerequisites" icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}>
                    <ul className="list-disc list-inside space-y-2 text-slate-300">
                        <li>Wazuh Manager running at <code className="px-2 py-0.5 bg-slate-800 rounded text-emerald-400">192.168.1.206:55000</code></li>
                        <li>Root/Administrator access on target machine</li>
                        <li>Network connectivity between agent and manager (port 1514, 1515)</li>
                        <li>Supported OS: Ubuntu, Debian, CentOS, RHEL, Windows, macOS</li>
                    </ul>
                </Section>

                {/* Quick Install */}
                <Section title="Quick Install (Ubuntu/Debian)" icon={<Terminal className="w-5 h-5 text-blue-400" />}>
                    <p className="text-sm text-slate-400 mb-4">Run this single command as root to install and register the agent:</p>
                    <CodeBlock
                        code={`curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh && \\
sudo WAZUH_MANAGER='192.168.1.206' bash wazuh-install.sh`}
                        onCopy={copyToClipboard}
                    />
                </Section>

                {/* Manual Install - Ubuntu/Debian */}
                <Section title="Manual Install - Ubuntu/Debian" icon={<Server className="w-5 h-5 text-purple-400" />}>
                    <div className="space-y-4">
                        <Step number={1} title="Import GPG key">
                            <CodeBlock
                                code={`curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --no-default-keyring \\
  --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import && \\
  chmod 644 /usr/share/keyrings/wazuh.gpg`}
                                onCopy={copyToClipboard}
                            />
                        </Step>

                        <Step number={2} title="Add repository">
                            <CodeBlock
                                code={`echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | \\
  tee -a /etc/apt/sources.list.d/wazuh.list`}
                                onCopy={copyToClipboard}
                            />
                        </Step>

                        <Step number={3} title="Install agent">
                            <CodeBlock
                                code={`apt-get update
WAZUH_MANAGER='192.168.1.206' WAZUH_AGENT_NAME='my-agent' apt-get install -y wazuh-agent`}
                                onCopy={copyToClipboard}
                            />
                        </Step>

                        <Step number={4} title="Enable and start service">
                            <CodeBlock
                                code={`systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent`}
                                onCopy={copyToClipboard}
                            />
                        </Step>

                        <Step number={5} title="Verify installation">
                            <CodeBlock
                                code={`systemctl status wazuh-agent
cat /var/ossec/etc/ossec.conf | grep -A3 'client'`}
                                onCopy={copyToClipboard}
                            />
                        </Step>
                    </div>
                </Section>

                {/* Windows Install */}
                <Section title="Windows Installation" icon={<Download className="w-5 h-5 text-yellow-400" />}>
                    <div className="space-y-4">
                        <Step number={1} title="Download installer">
                            <p className="text-slate-300 mb-2">Download the Wazuh agent MSI from:</p>
                            <a
                                href="https://packages.wazuh.com/4.x/windows/wazuh-agent-4.7.2-1.msi"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-400 hover:underline"
                            >
                                https://packages.wazuh.com/4.x/windows/wazuh-agent-4.7.2-1.msi
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </Step>

                        <Step number={2} title="Run installer (PowerShell as Admin)">
                            <CodeBlock
                                code={`msiexec.exe /i wazuh-agent-4.7.2-1.msi /q \\
  WAZUH_MANAGER='192.168.1.206' \\
  WAZUH_AGENT_NAME='windows-pc' \\
  WAZUH_REGISTRATION_SERVER='192.168.1.206'`}
                                onCopy={copyToClipboard}
                            />
                        </Step>

                        <Step number={3} title="Start service">
                            <CodeBlock
                                code={`NET START WazuhSvc`}
                                onCopy={copyToClipboard}
                            />
                        </Step>
                    </div>
                </Section>

                {/* Troubleshooting */}
                <Section title="Troubleshooting" icon={<Book className="w-5 h-5 text-red-400" />}>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <h4 className="font-medium text-slate-200 mb-2">Agent not connecting?</h4>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li>• Check firewall: ports 1514/1515 must be open</li>
                                <li>• Verify manager IP in <code>/var/ossec/etc/ossec.conf</code></li>
                                <li>• Check logs: <code>/var/ossec/logs/ossec.log</code></li>
                            </ul>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <h4 className="font-medium text-slate-200 mb-2">Registration failed?</h4>
                            <ul className="text-sm text-slate-400 space-y-1">
                                <li>• Ensure manager authd service is running</li>
                                <li>• Check agent key: <code>/var/ossec/etc/client.keys</code></li>
                                <li>• Restart agent after fixing: <code>systemctl restart wazuh-agent</code></li>
                            </ul>
                        </div>
                    </div>
                </Section>

            </main>
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
                {icon} {title}
            </h3>
            {children}
        </section>
    );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
    return (
        <div className="pl-4 border-l-2 border-slate-700">
            <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-emerald-400">
                    {number}
                </span>
                <span className="text-slate-200 font-medium">{title}</span>
            </div>
            {children}
        </div>
    );
}

function CodeBlock({ code, onCopy }: { code: string; onCopy: (text: string) => void }) {
    return (
        <div className="relative group">
            <pre className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-sm text-emerald-400 font-mono overflow-x-auto">
                {code}
            </pre>
            <button
                onClick={() => onCopy(code)}
                className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy to clipboard"
            >
                <Copy className="w-4 h-4 text-slate-400" />
            </button>
        </div>
    );
}
