# Claude Sessions — Obsidian Plugin

Auto-saves Claude Code session context to your Obsidian vault after every session.

## What it does

- Watches a queue folder for Claude Code transcripts dropped by a Stop hook
- Calls an AI (Anthropic or OpenRouter) to generate a narrative summary
- Writes a session note to `00-Inbox/` for your sorter agent to file
- Appends a `## Terminal Recap` section to your daily note
- Writes a `latest.md` context file injected at the start of each new Claude session

## Installation (via BRAT)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Obsidian community plugins
2. Open BRAT settings → **Add Beta Plugin**
3. Paste: `cameronwolf-coder/obsidian-claude-sessions`
4. Enable the plugin in Settings → Community Plugins

## Manual installation

Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
Place them in: `{vault}/.obsidian/plugins/claude-sessions/`

## Setup

1. Install the Claude Code Stop hook — copy `queue-session.sh` to `~/.claude/hooks/`
2. Add to `~/.claude/settings.json`:
```json
{
  "hooks": {
    "Stop": [{ "type": "command", "command": "bash ~/.claude/hooks/queue-session.sh" }],
    "SessionStart": [{ "type": "command", "command": "bash ~/.claude/hooks/inject-context.sh" }]
  }
}
```
3. Configure the plugin in Settings → Claude Sessions — set your AI provider and API key

## Hook scripts

See `hooks/` folder in this repo.
