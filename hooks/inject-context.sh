#!/usr/bin/env bash
# Claude Code SessionStart hook — injects prior session context
# Prints latest.md to stdout so Claude Code sees it as session context.

VAULT="${OBSIDIAN_VAULT_PATH:-$HOME/Documents/Obsidian Vault}"
CONTEXT="$VAULT/_System/claude-context/latest.md"

[ -f "$CONTEXT" ] && cat "$CONTEXT"
exit 0
