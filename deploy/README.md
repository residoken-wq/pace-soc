# Production deployment: soc.pace.edu.vn

Production uses an immutable dashboard image from GitHub Container Registry,
Caddy for automatic HTTPS, and a dedicated GitHub Actions self-hosted runner.

## One-time VM preparation

1. Point the public DNS `A`/`AAAA` record for `soc.pace.edu.vn` to the VM.
2. Allow inbound TCP 80 and TCP/UDP 443. Restrict SSH to administrator networks.
3. Install Docker Engine and the Docker Compose plugin from Docker's official
   Ubuntu repository.
4. Create the runtime directory:

   ```bash
   sudo install -d -m 750 -o "$USER" -g docker /opt/pace-soc
   ```

5. Copy `.env.production.example` to `/opt/pace-soc/.env.production`, replace
   every placeholder, then protect it:

   ```bash
   chmod 600 /opt/pace-soc/.env.production
   ```

6. Put the CA certificate chain used by Wazuh at:

   ```text
   /opt/pace-soc/wazuh-ca-bundle.pem
   ```

   Keep `NODE_TLS_REJECT_UNAUTHORIZED=1`. Do not disable TLS verification in
   production.

7. In GitHub, open **Settings → Actions → Runners**, add a Linux x64
   self-hosted runner, and follow GitHub's generated installation commands.
   Install it under a dedicated unprivileged account, register the custom label
   `pace-soc-production`, and install it as a system service.

8. Give only that runner account permission to operate Docker:

   ```bash
   sudo usermod -aG docker <runner-user>
   ```

   Restart the runner service after changing group membership.

## GitHub configuration

Create a GitHub Environment named `production`. Initially enable **required
reviewers** so deployment needs approval after an image is built. Remove the
approval later only if fully automatic production releases are desired.

The workflow uses the repository `GITHUB_TOKEN` for GHCR. In repository
**Settings → Actions → General**, set workflow permissions to **Read and write**.

Protect `main` and require the `Dashboard checks` status check before merge.
Develop on `feature/*` branches and merge through pull requests.

## Release flow

1. Push a feature branch.
2. Open a pull request to `main`.
3. CI runs lint and the production build.
4. Merge after review.
5. GitHub builds `ghcr.io/<owner>/pace-soc-dashboard:<commit-sha>`.
6. The production runner deploys the image and checks
   `https://soc.pace.edu.vn/api/health`.
7. A failed deployment automatically restores the last successful image.

## Operations

On the VM, inspect services with:

```bash
docker compose --project-name pace-soc \
  --file <runner-workspace>/deploy/compose.production.yml ps
docker logs --tail 200 pace-soc-dashboard
docker logs --tail 200 pace-soc-caddy
```

Caddy needs public access to ports 80/443 for normal ACME certificate issuance.
If `soc.pace.edu.vn` is private-only, replace this with an internal certificate
or configure a DNS-01 ACME provider.
