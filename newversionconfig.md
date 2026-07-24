# PACE SOC Deployment Guide

This guide explains how to develop locally, push reviewed code to GitHub, and
automatically deploy the production application to:

**https://soc.pace.edu.vn**

## Deployment architecture

```text
Local development
    |
    v
Feature branch on GitHub
    |
    v
Pull request and automatic CI checks
    |
    v
Merge into main
    |
    v
GitHub builds an immutable Docker image
    |
    v
GitHub Container Registry (GHCR)
    |
    v
Self-hosted GitHub runner on the Ubuntu VM
    |
    v
Docker Compose + Caddy HTTPS
    |
    v
https://soc.pace.edu.vn
```

---

## Part 1: Prepare the local development computer

### 1. Install Node.js 24

Check whether Node.js is already installed:

```bash
node --version
npm --version
```

If the commands are unavailable, install Node.js 24:

```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify the installation:

```bash
node --version
npm --version
```

### 2. Open the dashboard project

```bash
cd "/home/nt.nhan@pace.edu.vn/Documents/github/pace-soc/soc-agent/dashboard"
```

### 3. Create the local environment file

```bash
nano .env.local
```

Add:

```dotenv
SOC_ADMIN_PASSWORD=choose-a-local-admin-password
SOC_ANALYST_PASSWORD=choose-a-local-analyst-password
JWT_SECRET=replace-with-at-least-32-random-characters
ALLOWED_ORIGIN=http://localhost:3000

WAZUH_MANAGER_URL=https://YOUR_WAZUH_MANAGER:55000
WAZUH_API_USER=wazuh-wui
WAZUH_API_PASSWORD=replace-with-wazuh-api-password

WAZUH_INDEXER_URL=https://YOUR_WAZUH_INDEXER:9200
WAZUH_INDEXER_USER=replace-with-indexer-user
WAZUH_INDEXER_PASSWORD=replace-with-indexer-password

# Local testing only when Wazuh uses an untrusted certificate.
NODE_TLS_REJECT_UNAUTHORIZED=0
```

Generate a JWT secret:

```bash
openssl rand -hex 32
```

Copy the output into `JWT_SECRET`.

The `.env.local` file is ignored by Git and must never be committed.

### 4. Install dependencies

```bash
npm ci
```

### 5. Start the local development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Sign in with:

```text
Username: admin
Password: the value of SOC_ADMIN_PASSWORD
```

Stop the development server with `Ctrl+C`.

### 6. Validate changes before pushing

Run:

```bash
npm run lint
npm run build
```

Do not push the change until both commands pass.

---

## Part 2: Normal Git development workflow

Do not develop directly on `main`.

### 1. Update the local main branch

From the repository root:

```bash
cd "/home/nt.nhan@pace.edu.vn/Documents/github/pace-soc"
git switch main
git pull --ff-only origin main
```

### 2. Create a feature branch

Example:

```bash
git switch -c feature/device-health-monitoring
```

Recommended branch names:

```text
feature/name-of-feature
fix/name-of-bug
security/name-of-security-change
docs/name-of-documentation-change
```

### 3. Develop and test locally

```bash
cd soc-agent/dashboard
npm run dev
```

Before committing:

```bash
npm run lint
npm run build
```

### 4. Commit the change

Return to the repository root:

```bash
cd "/home/nt.nhan@pace.edu.vn/Documents/github/pace-soc"
git status
git add .
git commit -m "feat: add device health monitoring"
```

Review what will be pushed:

```bash
git show --stat
```

### 5. Push the feature branch

```bash
git push -u origin feature/device-health-monitoring
```

### 6. Create a GitHub pull request

On GitHub:

1. Open the `pace-soc` repository.
2. Click **Compare & pull request**.
3. Set the base branch to `main`.
4. Review the changed files.
5. Wait for the `Dashboard checks` CI job to pass.
6. Approve and merge the pull request.

After the pull request is merged, the production workflow builds and deploys
the exact Git commit automatically.

---

## Part 3: Prepare the on-premise Ubuntu production VM

Complete this section only once.

### 1. Recommended VM resources

Minimum for the dashboard and reverse proxy:

```text
Ubuntu: 24.04 LTS
CPU: 4 cores
RAM: 8 GB
Storage: 80 GB SSD
```

Wazuh Indexer may require substantially more memory. Prefer running the Wazuh
Indexer separately from the dashboard VM.

### 2. Configure DNS

Create a DNS record:

```text
Type: A
Name: soc
Value: PUBLIC_IP_OF_THE_ON_PREMISE_VM
```

If IPv6 is used, also configure an `AAAA` record.

Verify DNS:

```bash
getent hosts soc.pace.edu.vn
```

The returned address must point to the production VM or its public firewall.

### 3. Configure router or firewall forwarding

Forward these ports to the VM:

```text
TCP 80
TCP 443
UDP 443
```

Restrict SSH port 22 to trusted administrator IP addresses or a VPN.

If UFW is enabled on the VM:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw status
```

Do not expose Wazuh Manager or Indexer ports directly to the internet unless
they are protected by strict firewall rules.

### 4. Install Docker Engine

Install Docker Engine and the Docker Compose plugin using Docker's official
Ubuntu installation instructions.

Verify:

```bash
docker --version
docker compose version
```

Enable Docker:

```bash
sudo systemctl enable --now docker
sudo systemctl status docker
```

### 5. Create the production configuration directory

Run on the VM:

```bash
sudo groupadd -f docker
sudo install -d -m 750 -o "$USER" -g docker /opt/pace-soc
```

### 6. Create the production environment file

From a checked-out copy of the repository:

```bash
cp deploy/.env.production.example /opt/pace-soc/.env.production
nano /opt/pace-soc/.env.production
```

Configure every value:

```dotenv
SOC_ADMIN_PASSWORD=REPLACE_WITH_LONG_RANDOM_PASSWORD
SOC_ANALYST_PASSWORD=REPLACE_WITH_LONG_RANDOM_PASSWORD
JWT_SECRET=REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS

WAZUH_MANAGER_URL=https://WAZUH_INTERNAL_ADDRESS:55000
WAZUH_API_USER=wazuh-wui
WAZUH_API_PASSWORD=REPLACE_WITH_WAZUH_PASSWORD

WAZUH_INDEXER_URL=https://WAZUH_INDEXER_INTERNAL_ADDRESS:9200
WAZUH_INDEXER_USER=dashboard-reader
WAZUH_INDEXER_PASSWORD=REPLACE_WITH_INDEXER_PASSWORD

NODE_TLS_REJECT_UNAUTHORIZED=1
ACME_EMAIL=it@pace.edu.vn
```

Generate random passwords and secrets:

```bash
openssl rand -hex 32
```

Protect the file:

```bash
chmod 600 /opt/pace-soc/.env.production
ls -l /opt/pace-soc/.env.production
```

Never commit `/opt/pace-soc/.env.production` to Git.

### 7. Install the Wazuh CA certificate

Copy the certificate authority chain used to sign the Wazuh Manager and Wazuh
Indexer certificates to:

```text
/opt/pace-soc/wazuh-ca-bundle.pem
```

Protect and validate it:

```bash
chmod 644 /opt/pace-soc/wazuh-ca-bundle.pem
openssl x509 \
  -in /opt/pace-soc/wazuh-ca-bundle.pem \
  -noout \
  -subject \
  -issuer \
  -dates
```

Production must use:

```dotenv
NODE_TLS_REJECT_UNAUTHORIZED=1
```

Do not disable certificate validation in production.

### 8. Confirm Wazuh connectivity from the VM

Test the Wazuh API:

```bash
curl --cacert /opt/pace-soc/wazuh-ca-bundle.pem \
  https://WAZUH_INTERNAL_ADDRESS:55000/
```

Test the Wazuh Indexer:

```bash
curl --cacert /opt/pace-soc/wazuh-ca-bundle.pem \
  https://WAZUH_INDEXER_INTERNAL_ADDRESS:9200/
```

A `401 Unauthorized` response still confirms that the network and TLS
connection work. A timeout or certificate error must be fixed before deployment.

---

## Part 4: Install the GitHub self-hosted runner

Complete this section only once.

### 1. Create a dedicated runner user

On the production VM:

```bash
sudo adduser --disabled-password --gecos "" github-runner
sudo usermod -aG docker github-runner
```

Do not run the GitHub runner as `root`.

### 2. Create the runner in GitHub

Open:

```text
GitHub repository
→ Settings
→ Actions
→ Runners
→ New self-hosted runner
```

Select:

```text
Operating system: Linux
Architecture: x64
```

GitHub will display commands containing a temporary registration token. Run
those exact commands as the `github-runner` user.

Example login:

```bash
sudo -iu github-runner
```

Install the runner under:

```text
/home/github-runner/actions-runner
```

When the configuration command asks for labels, include:

```text
pace-soc-production
```

The final runner labels must include:

```text
self-hosted
linux
x64
pace-soc-production
```

### 3. Install the runner as a service

Follow the service commands printed by GitHub. From the runner directory they
normally resemble:

```bash
sudo ./svc.sh install github-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

Return to GitHub and verify that the runner status is **Idle**.

### 4. Verify Docker permission

As the runner user:

```bash
sudo -iu github-runner
docker ps
docker compose version
```

If permission is denied, restart the runner service or reboot the VM after
adding the user to the `docker` group.

The Docker group provides root-equivalent access. The runner must be dedicated
to this trusted repository and must never execute untrusted pull-request code.

---

## Part 5: Configure GitHub CI/CD

Complete this section only once.

### 1. Enable workflow package permissions

Open:

```text
GitHub repository
→ Settings
→ Actions
→ General
→ Workflow permissions
```

Select:

```text
Read and write permissions
```

Save the setting.

This allows the workflow to publish the dashboard image to GitHub Container
Registry.

### 2. Create the production environment

Open:

```text
GitHub repository
→ Settings
→ Environments
→ New environment
```

Environment name:

```text
production
```

Initially enable required reviewers. With approval enabled:

```text
Merge to main
→ CI and image build
→ GitHub requests production approval
→ approved release deploys
```

After the process is stable, remove required reviewers if completely automatic
deployment is preferred.

### 3. Protect the main branch

Create a branch protection rule for:

```text
main
```

Recommended settings:

- Require a pull request before merging.
- Require status checks before merging.
- Require the `Dashboard checks` status check.
- Require branches to be up to date before merging.
- Block force pushes.
- Block branch deletion.
- Require one approval when multiple developers contribute.

### 4. Container package access

After the first successful image build, open:

```text
GitHub profile or organization
→ Packages
→ pace-soc-dashboard
→ Package settings
```

Confirm that the `pace-soc` repository has permission to read the package.

The production workflow logs into GHCR with the temporary GitHub Actions token.
No permanent registry password is stored on the VM.

---

## Part 6: First deployment

### 1. Review local changes

From the repository root:

```bash
git status
git diff --check
```

### 2. Create the first deployment branch

```bash
git switch -c feature/platform-ui-and-cicd
```

If the branch already exists, remain on it.

### 3. Validate the dashboard

```bash
cd soc-agent/dashboard
npm ci
npm run lint
npm run build
cd ../..
```

### 4. Commit

```bash
git add .
git commit -m "feat: add Ubuntu operations UI and production CI/CD"
```

### 5. Push

```bash
git push -u origin feature/platform-ui-and-cicd
```

### 6. Merge through a pull request

1. Open a pull request to `main`.
2. Wait for `Dashboard checks`.
3. Fix all failures before merging.
4. Merge the pull request.
5. Open the GitHub **Actions** tab.
6. Watch the **Deploy production** workflow.
7. Approve the `production` environment if approval is enabled.

The deployment workflow will:

1. Run lint and the production build.
2. Build the dashboard Docker image.
3. Tag it with the Git commit SHA.
4. Push it to GHCR.
5. Send the deployment job to the on-premise runner.
6. Start the dashboard and Caddy.
7. Check container health.
8. Check `https://soc.pace.edu.vn/api/health`.
9. Save the successful image reference.
10. Restore the previous image automatically if the new release fails.

### 7. Verify production

Open:

```text
https://soc.pace.edu.vn
```

Check the public health endpoint:

```bash
curl --fail --show-error https://soc.pace.edu.vn/api/health
```

Expected result:

```json
{
  "status": "ok",
  "service": "pace-soc-dashboard",
  "timestamp": "..."
}
```

Sign in and verify:

- Overview loads.
- Ubuntu Devices loads.
- Hardware Health loads.
- Organization loads.
- Ransomware Defense loads.
- Wazuh agents load.
- Alerts and logs load.
- Vulnerability data loads.

---

## Part 7: Check production services

On the production VM:

```bash
docker ps
```

Expected containers:

```text
pace-soc-dashboard
pace-soc-caddy
```

View the dashboard logs:

```bash
docker logs --tail 200 pace-soc-dashboard
```

Follow dashboard logs:

```bash
docker logs --follow pace-soc-dashboard
```

View Caddy logs:

```bash
docker logs --tail 200 pace-soc-caddy
```

Inspect dashboard health:

```bash
docker inspect \
  --format='{{json .State.Health}}' \
  pace-soc-dashboard
```

View deployed images:

```bash
docker images ghcr.io/residoken-wq/pace-soc-dashboard
```

View the last successful release:

```bash
cat /opt/pace-soc/.last-successful-image
```

---

## Part 8: Automatic and manual rollback

### Automatic rollback

The deployment script automatically restores the last successful image when:

- Docker Compose cannot start the new image.
- The container health check fails.
- `https://soc.pace.edu.vn/api/health` does not become healthy.

The GitHub deployment job will be marked as failed after rollback. Investigate
the logs before attempting another release.

### Manual rollback using Git

For a code-level rollback, revert the faulty commit:

```bash
git switch main
git pull --ff-only origin main
git revert COMMIT_SHA
git push origin main
```

The revert commit will pass through the normal production pipeline.

Do not use `git reset --hard` or force-push `main`.

### Manual image rollback on the VM

Use this only during an emergency.

Find an older image:

```bash
docker images ghcr.io/residoken-wq/pace-soc-dashboard
```

From a current runner workspace containing the repository:

```bash
./deploy/scripts/deploy.sh \
  ghcr.io/residoken-wq/pace-soc-dashboard:PREVIOUS_COMMIT_SHA
```

The preferred rollback method is still `git revert`, because it preserves an
auditable deployment history.

---

## Part 9: Troubleshooting

### CI lint fails

Run locally:

```bash
cd soc-agent/dashboard
npm ci
npm run lint
```

Correct all reported errors, commit, and push again.

### CI build fails

Run:

```bash
cd soc-agent/dashboard
npm ci
npm run build
```

Check TypeScript errors, missing files, imports, and environment validation.

### Deployment job waits forever

Check:

1. The VM is powered on.
2. The GitHub runner service is running.
3. The runner appears **Idle** in GitHub.
4. The runner includes the `pace-soc-production` label.

On the VM:

```bash
cd /home/github-runner/actions-runner
sudo ./svc.sh status
```

### GHCR login or image pull fails

Check:

1. Workflow permissions are set to **Read and write**.
2. The repository has access to the package.
3. The production runner has outbound HTTPS access to `ghcr.io`.
4. The deployment job has `packages: write` permission.

### HTTPS certificate fails

Check DNS:

```bash
getent hosts soc.pace.edu.vn
```

Check ports:

```bash
sudo ss -lntup | grep -E ':(80|443)\b'
```

Check Caddy:

```bash
docker logs --tail 300 pace-soc-caddy
```

Confirm that public inbound ports 80 and 443 reach this VM. If the site is
private-only, normal HTTP certificate validation will not work; configure an
internal certificate or DNS-01 validation instead.

### Dashboard container is unhealthy

```bash
docker logs --tail 300 pace-soc-dashboard
docker inspect \
  --format='{{json .State.Health}}' \
  pace-soc-dashboard
```

Test inside the container:

```bash
docker exec pace-soc-dashboard \
  wget -qO- http://127.0.0.1:3000/api/health
```

### Login fails

Check that these values exist in `/opt/pace-soc/.env.production`:

```text
SOC_ADMIN_PASSWORD
SOC_ANALYST_PASSWORD
JWT_SECRET
```

`JWT_SECRET` must contain at least 32 characters.

After changing the environment file, trigger a new deployment or restart:

```bash
docker restart pace-soc-dashboard
```

### Wazuh data is unavailable

Check:

- `WAZUH_MANAGER_URL`
- `WAZUH_API_USER`
- `WAZUH_API_PASSWORD`
- `WAZUH_INDEXER_URL`
- `WAZUH_INDEXER_USER`
- `WAZUH_INDEXER_PASSWORD`
- `/opt/pace-soc/wazuh-ca-bundle.pem`
- Firewall routing between the dashboard VM and Wazuh

Inspect logs:

```bash
docker logs --tail 300 pace-soc-dashboard
```

Do not solve production certificate errors by setting:

```dotenv
NODE_TLS_REJECT_UNAUTHORIZED=0
```

Install the correct CA chain instead.

---

## Part 10: Backup and maintenance

### Files to back up

Back up:

```text
/opt/pace-soc/.env.production
/opt/pace-soc/wazuh-ca-bundle.pem
Docker volume: pace-soc_dashboard-data
Docker volume: pace-soc_caddy-data
```

Store backups encrypted and restrict access.

### Update production configuration

1. Back up `/opt/pace-soc/.env.production`.
2. Edit the file.
3. Trigger the production workflow manually from GitHub Actions, or deploy a
   new commit.
4. Verify the health endpoint and application behavior.

### Regular checks

Perform regularly:

- Review failed GitHub Actions jobs.
- Review dashboard and Caddy logs.
- Confirm HTTPS certificate renewal.
- Confirm encrypted backups can be restored.
- Rotate SOC and Wazuh credentials.
- Update Docker and the Ubuntu VM.
- Remove inactive GitHub runners.
- Review GitHub branch protection and environment approvers.

---

## Quick release checklist

Use this checklist for every normal release:

- [ ] Create a `feature/*` or `fix/*` branch.
- [ ] Develop and test locally.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Review `git status` and changed files.
- [ ] Commit with a clear message.
- [ ] Push the feature branch.
- [ ] Open a pull request to `main`.
- [ ] Wait for CI to pass.
- [ ] Review and merge.
- [ ] Approve the production environment when required.
- [ ] Watch the deployment workflow.
- [ ] Check `https://soc.pace.edu.vn/api/health`.
- [ ] Sign in and test important workflows.

## Important files

```text
.github/workflows/ci.yml
.github/workflows/deploy-production.yml
deploy/compose.production.yml
deploy/Caddyfile
deploy/.env.production.example
deploy/scripts/deploy.sh
soc-agent/dashboard/Dockerfile
soc-agent/dashboard/app/api/health/route.ts
```

