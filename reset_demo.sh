#!/usr/bin/env bash
# -------------------------------------------------------
# Auditoria Demo Reset Script
# Usage:
#   ./reset_demo.sh fresh    → clear everything, start setup from scratch
#   ./reset_demo.sh restore  → reload 30-entry seed data for dashboard demo
# -------------------------------------------------------

MODE=${1:-fresh}

if [[ "$MODE" != "fresh" && "$MODE" != "restore" ]]; then
  echo "Usage: $0 [fresh|restore]"
  echo "  fresh   - clears all demo data so setup wizard starts from step 1"
  echo "  restore - restores seed audit log + worker config for dashboard demo"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/backend/data"
SEEDS_DIR="$DATA_DIR/seeds"

if [[ "$MODE" == "fresh" ]]; then
  echo "[] " > "$DATA_DIR/workers.json"
  echo "[] " > "$DATA_DIR/audit_log.json"
  echo "[] " > "$DATA_DIR/recent_emails.json"
  echo "✓ Fresh start: all data cleared. Open the app and click 'Supplier Payment Inquiries' to begin setup."

else
  cp "$SEEDS_DIR/workers_seed.json"       "$DATA_DIR/workers.json"
  cp "$SEEDS_DIR/audit_log_seed.json"     "$DATA_DIR/audit_log.json"
  cp "$SEEDS_DIR/recent_emails_seed.json" "$DATA_DIR/recent_emails.json"
  echo "✓ Restored: worker configured + 30 audit entries loaded. Go to Dashboard or Audit Trail."
fi
