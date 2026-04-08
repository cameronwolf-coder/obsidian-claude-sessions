#!/usr/bin/env bash
# Claude Code Stop hook — queues transcript for Obsidian Claude Sessions plugin
# Copies the session transcript JSONL into the vault's import queue folder.
# All processing logic lives in the plugin; this script stays thin.

set -euo pipefail

VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
QUEUE_DIR="$VAULT/_System/claude-import-queue"

# Read the Stop hook JSON payload from stdin
PAYLOAD=$(cat)

# Extract transcript_path and session_id (requires python3, always available on macOS)
TRANSCRIPT=$(printf '%s' "$PAYLOAD" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('transcript_path',''))" 2>/dev/null || true)
SESSION_ID=$(printf '%s' "$PAYLOAD" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(d.get('session_id',''))" 2>/dev/null || true)

# Bail out silently if no transcript (short subagent runs, etc.)
[ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ] && exit 0
[ -z "$SESSION_ID" ] && SESSION_ID="unknown"

# Create queue folder if it doesn't exist yet
mkdir -p "$QUEUE_DIR"

# Copy transcript with a sortable timestamp prefix
DEST="$QUEUE_DIR/$(date +%Y%m%d-%H%M%S)-${SESSION_ID}.jsonl"
cp "$TRANSCRIPT" "$DEST"

exit 0
