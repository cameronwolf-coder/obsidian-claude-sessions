# Claude Sessions — Obsidian Plugin

> Automatically captures every Claude Code session into your Obsidian vault — AI-summarized, tagged, and filed — so nothing falls through the cracks between sessions.

---

## The Problem

If you use Claude Code heavily, you know the pain: you finish a long session, context window compacts, and an hour later you can't remember exactly what you built, what files changed, or what decisions you made. The next session starts cold.

This plugin solves that by treating every Claude Code session as a first-class note in your vault.

---

## What It Does

After every Claude Code session ends, the plugin:

1. **Receives the transcript** via a Stop hook that Claude Code fires automatically
2. **Generates an AI summary** — narrative bullet points describing what was actually accomplished (not just raw tool call counts)
3. **Writes a session note** to your inbox with frontmatter tags, file list, git commits, and key commands
4. **Appends a Terminal Recap** to your daily note so your work log is always current
5. **Updates a context file** that gets injected at the start of your next Claude session — so Claude knows what was in progress

---

## Use Cases

### Never lose context between sessions

You're mid-feature across 3 sessions spread over 2 days. Instead of pasting your own notes into every new session, the plugin writes a `latest.md` summary automatically. Claude reads it at startup via a SessionStart hook — same context, zero effort.

```
## Last Claude Session — 2026-04-08 09:30
**Project:** truv-brain  **Branch:** fix/auth-middleware  **Duration:** 67min

- Rewrote token validation in auth.ts to meet new compliance requirements
- Updated 4 API handlers that relied on the old session cookie format
- Opened PR #94 — ready for review, blocked on legal sign-off
```

### Daily note that actually reflects your work

Your daily note gets a `## Terminal Recap` block after each session — timestamped, project-aware, with git commits called out. Useful for EOD standups, weekly retros, and billing logs.

```markdown
## Terminal Recap — 14:23

**Worked in:** truv-brain / fix/scout-500-lazy-pool-and-retry

- Fixed Scout dashboard 500 errors caused by eager HubSpot pool initialization on cold start
- Added 3x retry with exponential backoff for HubSpot 429 rate limit responses
- Shipped lazy pool init pattern across 3 services (scout, los-pos, outreach)

**Git:** fix(scout): lazy pool init + HubSpot 429 retry
```

### Vault-integrated session archive

Every session lands in your `00-Inbox/` as a structured note with YAML frontmatter. If you use a sorter/triage agent, it automatically files the note to the right project folder, adds wikilinks to related project notes, and updates your Maps of Content.

```yaml
---
date: 2026-04-08
project: truv-brain
branch: fix/scout-500-lazy-pool-and-retry
duration_min: 94
tool_calls: 155
type: dev-log
status: inbox
tags:
  - dev-log/claude-session
  - project/truv-brain
  - git/committed
---
```

### Long-running project continuity

Working a large migration over weeks? Every session note links back to your project note. Search `project/truv-brain` in Obsidian and you see the full timeline of dev sessions, what shipped each day, and where things stand.

### Team knowledge base (advanced)

Point multiple developers at the same vault (via Obsidian Sync or git). Each person's Claude sessions accumulate into a shared project log. New team members onboard by reading the session archive instead of asking "what did we do last sprint?"

---

## Architecture

```
Claude Code session ends
        │
        ▼
~/.claude/hooks/queue-session.sh    ← Stop hook (runs automatically)
        │  copies transcript JSONL
        ▼
{vault}/_System/claude-import-queue/
        │
        ▼
Obsidian Plugin (watches queue folder)
        │
        ├── Parses transcript
        ├── Calls AI (Anthropic or OpenRouter) for summary
        ├── Writes session note → {vault}/00-Inbox/
        ├── Appends Terminal Recap → {vault}/07-Daily/YYYY-MM-DD.md
        └── Writes context → {vault}/_System/claude-context/latest.md
                                        │
                                        ▼
                          Next session: inject-context.sh
                          cats latest.md into Claude's context
```

---

## Installation

### Via BRAT (recommended — gets auto-updates)

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the Obsidian community plugins
2. Settings → BRAT → **Add Beta Plugin**
3. Paste: `cameronwolf-coder/obsidian-claude-sessions`
4. Enable the plugin in Settings → Community Plugins

### Manual

Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/cameronwolf-coder/obsidian-claude-sessions/releases/latest).
Place in: `{vault}/.obsidian/plugins/claude-sessions/`

---

## Setup

### 1. Install the hook scripts

```bash
mkdir -p ~/.claude/hooks
curl -o ~/.claude/hooks/queue-session.sh \
  https://raw.githubusercontent.com/cameronwolf-coder/obsidian-claude-sessions/main/hooks/queue-session.sh
curl -o ~/.claude/hooks/inject-context.sh \
  https://raw.githubusercontent.com/cameronwolf-coder/obsidian-claude-sessions/main/hooks/inject-context.sh
chmod +x ~/.claude/hooks/queue-session.sh ~/.claude/hooks/inject-context.sh
```

### 2. Wire hooks into Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "bash ~/.claude/hooks/queue-session.sh" }
        ]
      }
    ],
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          { "type": "command", "command": "bash ~/.claude/hooks/inject-context.sh" }
        ]
      }
    ]
  }
}
```

### 3. Configure the plugin

Open Obsidian → Settings → Claude Sessions:

| Setting | Default | Description |
|---------|---------|-------------|
| Sessions folder | `00-Inbox` | Where session notes land (inbox for triage, or a fixed archive folder) |
| Daily notes folder | `07-Daily` | Your daily note folder (YYYY-MM-DD.md) |
| AI Provider | `anthropic` | Anthropic (direct), OpenRouter, or Disabled |
| API Key | — | Your Anthropic or OpenRouter key |
| Model | `claude-haiku-4-5-20251001` | Any valid model slug — free-text, not a dropdown |
| Min tool calls | `3` | Skip sessions below this threshold |
| Min duration | `3 min` | Skip sessions shorter than this |

### 4. Test it

Hit **Run test** in the plugin settings. It checks folder paths and API key format.

Then trigger a manual save from inside any Claude Code session:

```
/save-session
```

---

## AI Provider Options

### Anthropic (direct)

Uses the Anthropic Messages API. Set model to any Claude model ID:
- `claude-haiku-4-5-20251001` — fast, cheap, great for summaries
- `claude-sonnet-4-6` — higher quality

### OpenRouter

Access any model from any provider via one API key. Set the model field to any [OpenRouter model slug](https://openrouter.ai/models):
- `anthropic/claude-haiku-4`
- `openai/gpt-4o-mini`
- `google/gemini-flash-1.5`
- `meta-llama/llama-3.1-8b-instruct`

### Disabled

Falls back to mechanical extraction — raw tool counts, file list, git commits. No API key needed. Useful if you just want structured data without the narrative.

---

## Session Note Format

```markdown
---
date: 2026-04-08
session_id: 28a83d46-a2b5-4eb2-bab0-a36d01779e11
project: truv-brain
branch: fix/scout-500-lazy-pool-and-retry
duration_min: 94
tool_calls: 155
type: dev-log
status: inbox
tags:
  - dev-log/claude-session
  - project/truv-brain
  - git/committed
---

# Claude Session — truv-brain / fix/scout-500-lazy-pool-and-retry
2026-04-08 08:28

## Summary
- Fixed Scout dashboard 500 errors with lazy pool initialization on cold start
- Added retry backoff for HubSpot 429 rate limit responses across 3 services
- Built claude-sessions Obsidian plugin with OpenRouter support and auto-tagging

## Files Edited
- truv-scout/pool.py
- src/settings.ts
- src/processor.ts

## Git Activity
- fix(scout): lazy pool init + HubSpot 429 retry

## Commands Run
- `npm run build`
- `gh pr create --title "fix(scout-dashboard): lazy pool init + retry"`
```

---

## Filtering Short Sessions

The plugin skips sessions that are **both** below the tool call threshold **and** below the duration threshold. This means:
- A long discussion session (low tool calls, 45 min) → kept
- A quick one-liner (2 tool calls, 30 sec) → skipped
- Tune both sliders in settings to adjust the noise floor

---

## Vault Structure

The plugin writes Dataview-compatible frontmatter and works with any vault layout. The defaults assume:

```
vault/
├── 00-Inbox/                        ← session notes land here
├── 07-Daily/                        ← daily notes (YYYY-MM-DD.md)
└── _System/
    ├── claude-import-queue/         ← hook drops transcripts here
    └── claude-context/
        └── latest.md                ← context injection file
```

Change any of these paths in the plugin settings.

---

## Environment Variable

Set `OBSIDIAN_VAULT_PATH` if your vault is not at `~/Documents/Obsidian Vault`:

```bash
# Add to ~/.zshrc or ~/.bashrc
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
```

---

## License

MIT
