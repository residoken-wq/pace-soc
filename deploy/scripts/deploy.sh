#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 || "$1" != ghcr.io/*:* ]]; then
    echo "Usage: $0 ghcr.io/owner/image:immutable-tag" >&2
    exit 2
fi

readonly NEW_IMAGE="$1"
readonly DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly STATE_DIR="/opt/pace-soc"
readonly STATE_FILE="${STATE_DIR}/.last-successful-image"
readonly HEALTH_URL="https://soc.pace.edu.vn/api/health"

if [[ ! -r "${STATE_DIR}/.env.production" ]]; then
    echo "Missing ${STATE_DIR}/.env.production" >&2
    exit 1
fi

if [[ ! -r "${STATE_DIR}/wazuh-ca-bundle.pem" ]]; then
    echo "Missing ${STATE_DIR}/wazuh-ca-bundle.pem" >&2
    exit 1
fi

mkdir -p "${STATE_DIR}"
PREVIOUS_IMAGE=""
if [[ -r "${STATE_FILE}" ]]; then
    PREVIOUS_IMAGE="$(<"${STATE_FILE}")"
fi

deploy_image() {
    local image="$1"
    DASHBOARD_IMAGE="${image}" docker compose \
        --project-name pace-soc \
        --env-file "${STATE_DIR}/.env.production" \
        --file "${DEPLOY_DIR}/compose.production.yml" \
        up --detach --pull always --remove-orphans --wait
}

echo "Deploying ${NEW_IMAGE}"
if ! deploy_image "${NEW_IMAGE}"; then
    if [[ -n "${PREVIOUS_IMAGE}" ]]; then
        echo "Deployment failed; rolling back to ${PREVIOUS_IMAGE}" >&2
        deploy_image "${PREVIOUS_IMAGE}"
    fi
    exit 1
fi

healthy=false
for attempt in {1..12}; do
    if curl --fail --silent --show-error --max-time 10 "${HEALTH_URL}" >/dev/null; then
        healthy=true
        break
    fi
    sleep 5
done

if [[ "${healthy}" != true ]]; then
    echo "Public health check failed" >&2
    if [[ -n "${PREVIOUS_IMAGE}" ]]; then
        echo "Rolling back to ${PREVIOUS_IMAGE}" >&2
        deploy_image "${PREVIOUS_IMAGE}"
    fi
    exit 1
fi

printf '%s\n' "${NEW_IMAGE}" > "${STATE_FILE}"
docker image prune --force --filter "until=168h"
echo "Production is healthy at ${HEALTH_URL}"

