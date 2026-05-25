#!/bin/bash
#
# Idempotent provisioning of the four production alert rules recommended
# in docs/DEPLOYMENT.md (section "Alerting"). Uses the Sentry HTTP API
# directly so the rules live in version control (this script) instead of
# only in the dashboard.
#
# Requires:
#   - SENTRY_AUTH_TOKEN (must include "alerts:write" scope)
#   - SENTRY_ORG       — organisation slug (e.g. "hearst")
#   - SENTRY_PROJECT   — project slug (e.g. "hearst-connect")
#
# All three are read from .env.local automatically, or can be passed
# explicitly in the environment.
#
# Usage:
#   bash scripts/setup-sentry-alerts.sh
#
# The script POSTs once per rule. If a rule with the same name already
# exists, Sentry returns 409 and we skip silently — re-runs are no-ops.
#
# To add a webhook destination (Slack / Discord / PagerDuty), uncomment
# the "actions" block under each rule below and supply your integration.
# By default the rules notify the project's default channel only.

set -euo pipefail

cd "$(dirname "$0")/.."

# --- env loading ----------------------------------------------------------
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${SENTRY_AUTH_TOKEN:?SENTRY_AUTH_TOKEN is required (alerts:write scope)}"
: "${SENTRY_ORG:?SENTRY_ORG slug is required}"
: "${SENTRY_PROJECT:?SENTRY_PROJECT slug is required}"

API="https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/rules/"

# --- helpers --------------------------------------------------------------
existing_rule_names() {
  curl -sS -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" "$API" \
    | grep -oE '"name":"[^"]+"' | sed -E 's/"name":"(.+)"/\1/'
}

post_rule() {
  local name="$1"
  local payload="$2"

  if echo "$EXISTING" | grep -Fxq "$name"; then
    echo "  • $name : already exists, skip"
    return
  fi

  local body
  body=$(curl -sS -X POST "$API" \
    -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>&1)

  if echo "$body" | grep -q '"id"'; then
    echo "  ✓ $name"
  else
    echo "  ✗ $name : $(echo "$body" | head -c 200)"
  fi
}

EXISTING=$(existing_rule_names || echo "")

# --- rule 1 : high error rate -------------------------------------------
post_rule "High error rate (≥10 in 5 min)" '{
  "name": "High error rate (≥10 in 5 min)",
  "actionMatch": "all",
  "filterMatch": "all",
  "conditions": [
    {
      "id": "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
      "value": 10,
      "interval": "5m"
    }
  ],
  "filters": [],
  "actions": [
    {
      "id": "sentry.mail.actions.NotifyEmailAction",
      "targetType": "IssueOwners",
      "targetIdentifier": "None"
    }
  ],
  "frequency": 30
}'

# --- rule 2 : new issue ---------------------------------------------------
post_rule "New issue" '{
  "name": "New issue",
  "actionMatch": "all",
  "filterMatch": "all",
  "conditions": [
    {
      "id": "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"
    }
  ],
  "filters": [],
  "actions": [
    {
      "id": "sentry.mail.actions.NotifyEmailAction",
      "targetType": "IssueOwners",
      "targetIdentifier": "None"
    }
  ],
  "frequency": 5
}'

# --- rule 3 : rate-limit breach ------------------------------------------
post_rule "Rate-limit breach (≥5 in 1 min)" '{
  "name": "Rate-limit breach (≥5 in 1 min)",
  "actionMatch": "all",
  "filterMatch": "all",
  "conditions": [
    {
      "id": "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
      "value": 5,
      "interval": "1m"
    }
  ],
  "filters": [
    {
      "id": "sentry.rules.filters.tagged_event.TaggedEventFilter",
      "match": "eq",
      "key": "rate_limit",
      "value": "breach"
    }
  ],
  "actions": [
    {
      "id": "sentry.mail.actions.NotifyEmailAction",
      "targetType": "IssueOwners",
      "targetIdentifier": "None"
    }
  ],
  "frequency": 15
}'

# --- rule 4 : auth failure spike -----------------------------------------
post_rule "Login failure spike (≥10 in 5 min)" '{
  "name": "Login failure spike (≥10 in 5 min)",
  "actionMatch": "all",
  "filterMatch": "all",
  "conditions": [
    {
      "id": "sentry.rules.conditions.event_frequency.EventFrequencyCondition",
      "value": 10,
      "interval": "5m"
    }
  ],
  "filters": [
    {
      "id": "sentry.rules.filters.tagged_event.TaggedEventFilter",
      "match": "eq",
      "key": "logger",
      "value": "login"
    }
  ],
  "actions": [
    {
      "id": "sentry.mail.actions.NotifyEmailAction",
      "targetType": "IssueOwners",
      "targetIdentifier": "None"
    }
  ],
  "frequency": 30
}'

echo ""
echo "Done. View / edit rules at:"
echo "  https://sentry.io/organizations/${SENTRY_ORG}/alerts/rules/${SENTRY_PROJECT}/"
