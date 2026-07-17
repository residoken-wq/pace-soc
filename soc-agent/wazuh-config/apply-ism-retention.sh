#!/usr/bin/env bash
set -euo pipefail

: "${WAZUH_INDEXER_URL:?Set WAZUH_INDEXER_URL, for example https://indexer.internal:9200}"
: "${WAZUH_INDEXER_USER:?Set WAZUH_INDEXER_USER to a least-privilege indexer user}"
: "${WAZUH_INDEXER_PASSWORD:?Set WAZUH_INDEXER_PASSWORD via a secret manager}"
: "${WAZUH_CA_CERT:?Set WAZUH_CA_CERT to the internal CA certificate path}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
POLICY_FILE="$SCRIPT_DIR/wazuh-alert-retention-policy.json"

curl --fail --silent --show-error \
  --cacert "$WAZUH_CA_CERT" \
  --user "$WAZUH_INDEXER_USER:$WAZUH_INDEXER_PASSWORD" \
  --header 'Content-Type: application/json' \
  --request PUT \
  "$WAZUH_INDEXER_URL/_plugins/_ism/policies/soc-wazuh-alert-retention-90d" \
  --data-binary "@$POLICY_FILE"

echo "ISM policy installed. Verify it is attached to wazuh-alerts-* indices before enabling deletion."
