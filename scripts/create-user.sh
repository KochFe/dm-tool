#!/usr/bin/env bash
# Create a DM Co-Pilot user on the VPS (prod or dev stack).
#
# Usage:
#   ./scripts/create-user.sh <prod|dev> <email> <display_name> [--role dm|player]
#
# Examples:
#   ./scripts/create-user.sh prod alice@example.com "Alice"
#   ./scripts/create-user.sh dev  bob@example.com   "Bob" --role player
#
# Password is prompted interactively by the underlying Python script.

set -euo pipefail

if [[ $# -lt 3 ]]; then
  cat <<EOF >&2
Usage: $0 <prod|dev> <email> <display_name> [--role dm|player]
EOF
  exit 64
fi

ENV_NAME="$1"; shift

case "$ENV_NAME" in
  prod)
    COMPOSE_FILE="docker-compose.prod.yml"
    SERVICE="backend"
    ;;
  dev)
    COMPOSE_FILE="docker-compose.dev.yml"
    SERVICE="dev-backend"
    ;;
  *)
    echo "Error: first argument must be 'prod' or 'dev' (got '$ENV_NAME')" >&2
    exit 64
    ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Error: $COMPOSE_FILE not found in $REPO_ROOT" >&2
  exit 66
fi

exec docker compose -f "$COMPOSE_FILE" exec "$SERVICE" \
  python scripts/create_user.py "$@"
