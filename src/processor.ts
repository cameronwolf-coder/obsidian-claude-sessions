import { App, requestUrl, TFile } from "obsidian";
import type { ClaudeSessionsSettings, SessionMeta, TranscriptEntry } from "./types";
import { resolveKey } from "./keychain";

// ── Parsing ──────────────────────────────────────────────────────────────────

export function parseTranscript(raw: string): TranscriptEntry[] {
	const entries: TranscriptEntry[] = [];
	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			entries.push(JSON.parse(trimmed) as TranscriptEntry);
		} catch {
			// Skip malformed lines (can occur when hook reads a mid-write file)
		}
	}
	return entries;
}

export function extractMeta(entries: TranscriptEntry[], sessionId: string): SessionMeta {
	const timestamps = entries
		.map((e) => e.timestamp)
		.filter((t): t is string => !!t)
		.map((t) => new Date(t).getTime())
		.filter((t) => !isNaN(t));

	const startMs = timestamps.length ? Math.min(...timestamps) : Date.now();
	const endMs = timestamps.length ? Math.max(...timestamps) : Date.now();
	const startTime = new Date(startMs);
	const endTime = new Date(endMs);
	const durationMin = Math.round((endMs - startMs) / 60000);

	// cwd and branch from first entry that has them
	const cwdEntry = entries.find((e) => e.cwd);
	const cwd = cwdEntry?.cwd ?? "";
	const project = cwd ? cwd.split("/").pop() ?? cwd : "unknown";
	const branch = cwdEntry?.gitBranch ?? entries.find((e) => e.gitBranch)?.gitBranch ?? "unknown";

	// Count tool_use items in assistant messages
	let toolCallCount = 0;
	const bashCommands: string[] = [];
	const filesEdited: string[] = [];
	const gitCommits: string[] = [];

	for (const entry of entries) {
		const content = entry.message?.content;
		if (!Array.isArray(content)) continue;
		for (const item of content) {
			if (item.type !== "tool_use") continue;
			toolCallCount++;
			const name = item.name ?? "";
			const input = item.input as Record<string, unknown> | undefined;

			if (name === "Bash" && input?.command) {
				const cmd = String(input.command);
				// Filter out noise: keep meaningful commands
				if (!isNoisyCommand(cmd)) {
					bashCommands.push(cmd.split("\n")[0].trim().slice(0, 120));
				}
				// Extract git commits
				if (cmd.includes("git commit")) {
					const msgMatch = cmd.match(/-m\s+["']([^"']+)["']/);
					if (msgMatch) gitCommits.push(msgMatch[1]);
				}
			}

			if ((name === "Edit" || name === "Write") && input?.file_path) {
				const fp = String(input.file_path);
				const rel = fp.split("/").slice(-2).join("/");
				if (!filesEdited.includes(rel)) filesEdited.push(rel);
			}
		}
	}

	// First user text message (the initial task)
	let firstUserMessage = "";
	for (const entry of entries) {
		if (entry.type !== "user") continue;
		const content = entry.message?.content;
		if (!Array.isArray(content)) continue;
		const textItem = content.find((c) => c.type === "text" && c.text?.trim());
		if (textItem?.text) {
			firstUserMessage = textItem.text.trim().slice(0, 300);
			break;
		}
	}

	// Last assistant text message
	let lastAssistantText = "";
	for (const entry of [...entries].reverse()) {
		if (entry.type !== "assistant") continue;
		const content = entry.message?.content;
		if (!Array.isArray(content)) continue;
		const textItem = content.find((c) => c.type === "text" && c.text?.trim());
		if (textItem?.text) {
			lastAssistantText = textItem.text.trim().slice(0, 400);
			break;
		}
	}

	return {
		sessionId,
		cwd,
		project,
		branch,
		startTime,
		endTime,
		durationMin,
		toolCallCount,
		filesEdited: filesEdited.slice(0, 20),
		bashCommands: dedupeCommands(bashCommands).slice(0, 15),
		gitCommits: gitCommits.slice(0, 10),
		firstUserMessage,
		lastAssistantText,
	};
}

function isNoisyCommand(cmd: string): boolean {
	const noise = [
		"git status", "git log", "git diff", "git branch", "git show",
		"cat ", "head ", "tail ", "ls ", "echo ", "pwd", "which ",
		"grep ", "rg ", "find ",
	];
	return noise.some((n) => cmd.startsWith(n));
}

function dedupeCommands(cmds: string[]): string[] {
	const seen = new Set<string>();
	return cmds.filter((c) => {
		const key = c.slice(0, 40);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

// ── Threshold check ───────────────────────────────────────────────────────────

export function shouldSkip(meta: SessionMeta, settings: ClaudeSessionsSettings): boolean {
	// Skip only if BOTH are below threshold (long discussions with few tools still count)
	return meta.toolCallCount < settings.minToolCalls && meta.durationMin < settings.minDurationMin;
}

// ── AI Summary ────────────────────────────────────────────────────────────────

export async function generateAISummary(
	meta: SessionMeta,
	settings: ClaudeSessionsSettings
): Promise<string> {
	const prompt = buildSummaryPrompt(meta);

	const anthropicKey = resolveKey("anthropic", settings.anthropicApiKey);
	const openRouterKey = resolveKey("openrouter", settings.openRouterApiKey);

	if (settings.aiProvider === "anthropic" && anthropicKey) {
		try {
			const response = await requestUrl({
				url: "https://api.anthropic.com/v1/messages",
				method: "POST",
				headers: {
					"x-api-key": anthropicKey,
					"anthropic-version": "2023-06-01",
					"content-type": "application/json",
				},
				body: JSON.stringify({
					model: settings.aiModel,
					max_tokens: 600,
					messages: [{ role: "user", content: prompt }],
				}),
			});
			const text = response.json?.content?.[0]?.text as string | undefined;
			if (text?.trim()) return text.trim();
		} catch {
			// Fall through to mechanical
		}
	} else if (settings.aiProvider === "openrouter" && openRouterKey) {
		try {
			const response = await requestUrl({
				url: "https://openrouter.ai/api/v1/chat/completions",
				method: "POST",
				headers: {
					"Authorization": `Bearer ${openRouterKey}`,
					"content-type": "application/json",
					"HTTP-Referer": "obsidian://claude-sessions",
					"X-Title": "Claude Sessions",
				},
				body: JSON.stringify({
					model: settings.openRouterModel,
					max_tokens: 600,
					messages: [{ role: "user", content: prompt }],
				}),
			});
			const text = response.json?.choices?.[0]?.message?.content as string | undefined;
			if (text?.trim()) return text.trim();
		} catch {
			// Fall through to mechanical
		}
	}

	return buildMechanicalSummary(meta);
}

function buildSummaryPrompt(meta: SessionMeta): string {
	const contextLines: string[] = [
		`Project: ${meta.project} (branch: ${meta.branch})`,
		`Duration: ${meta.durationMin} minutes`,
		`Tool calls: ${meta.toolCallCount}`,
	];
	if (meta.filesEdited.length) contextLines.push(`Files edited: ${meta.filesEdited.join(", ")}`);
	if (meta.gitCommits.length) contextLines.push(`Git commits: ${meta.gitCommits.join("; ")}`);
	if (meta.bashCommands.length) contextLines.push(`Key commands: ${meta.bashCommands.slice(0, 8).join(", ")}`);
	if (meta.firstUserMessage) contextLines.push(`Initial task: "${meta.firstUserMessage}"`);
	if (meta.lastAssistantText) contextLines.push(`Completion note: "${meta.lastAssistantText.slice(0, 200)}"`);
	const context = contextLines.join("\n");

	return `You are generating a "Terminal Recap" section for an Obsidian daily note.

Session context:
${context}

Write 3–6 bullet points summarizing what happened. Rules:
- Past tense, specific and concrete
- Include numbers/metrics when available
- Focus on what was accomplished, not just what was attempted
- Match this style: "Migrated 3,700 historical campaign events from Upstash Redis to Postgres (4 campaigns)"
- If git commits exist, mention them
- Start each bullet with "- "
- No section headers, just bullets`;
}

export function buildMechanicalSummary(meta: SessionMeta): string {
	const lines: string[] = [];
	lines.push(
		`- Ran ${meta.toolCallCount} tool calls over ${meta.durationMin} min in ${meta.project} (branch: ${meta.branch})`
	);
	if (meta.filesEdited.length) {
		lines.push(`- Edited ${meta.filesEdited.length} file(s): ${meta.filesEdited.slice(0, 5).join(", ")}`);
	}
	if (meta.gitCommits.length) {
		lines.push(`- Git: ${meta.gitCommits.join("; ")}`);
	}
	if (meta.bashCommands.length) {
		lines.push(`- Key commands: ${meta.bashCommands.slice(0, 4).join(", ")}`);
	}
	return lines.join("\n");
}

// ── Secret redaction ──────────────────────────────────────────────────────────

export function redactSecrets(text: string): string {
	return text
		.replace(/\b(api[_-]?key|token|secret|password|passwd|auth[_-]?key)\s*[=:]\s*\S+/gi, "$1=[REDACTED]")
		.replace(/sk-ant-[A-Za-z0-9_-]{20,}/g, "sk-ant-[REDACTED]")
		.replace(/Bearer\s+[A-Za-z0-9_\-.]{20,}/g, "Bearer [REDACTED]");
}

// ── Note formatters ───────────────────────────────────────────────────────────

function buildTags(meta: SessionMeta): string[] {
	const tags: string[] = ["dev-log/claude-session"];

	// project/name — sanitize to valid tag (lowercase, hyphens)
	if (meta.project && meta.project !== "unknown") {
		const projectTag = meta.project.toLowerCase().replace(/[^a-z0-9-]/g, "-");
		tags.push(`project/${projectTag}`);
	}

	// git/committed if there were any commits
	if (meta.gitCommits.length > 0) {
		tags.push("git/committed");
	}

	return tags;
}

export function formatSessionNote(meta: SessionMeta, summary: string): string {
	const dateStr = meta.startTime.toISOString().split("T")[0];
	const timeStr = meta.startTime.toTimeString().slice(0, 5);

	const tags = buildTags(meta);
	const tagsYaml = tags.map((t) => `  - ${t}`).join("\n");

	const frontmatter = [
		"---",
		`date: ${dateStr}`,
		`session_id: ${meta.sessionId}`,
		`project: ${meta.project}`,
		`branch: ${meta.branch}`,
		`duration_min: ${meta.durationMin}`,
		`tool_calls: ${meta.toolCallCount}`,
		`type: dev-log`,
		`status: inbox`,
		`tags:\n${tagsYaml}`,
		"---",
	].join("\n");

	const sections: string[] = [
		frontmatter,
		"",
		`# Claude Session — ${meta.project} / ${meta.branch}`,
		`${dateStr} ${timeStr}`,
		"",
		"## Summary",
		summary,
	];

	if (meta.filesEdited.length) {
		sections.push("", "## Files Edited");
		meta.filesEdited.forEach((f) => sections.push(`- ${f}`));
	}

	if (meta.gitCommits.length) {
		sections.push("", "## Git Activity");
		meta.gitCommits.forEach((c) => sections.push(`- ${c}`));
	}

	if (meta.bashCommands.length) {
		sections.push("", "## Commands Run");
		meta.bashCommands.slice(0, 10).forEach((c) => sections.push(`- \`${c}\``));
	}

	return sections.join("\n");
}

export function formatDailyRecap(meta: SessionMeta, summary: string): string {
	const timeStr = meta.startTime.toTimeString().slice(0, 5);
	const gitLine = meta.gitCommits.length
		? meta.gitCommits.join("; ")
		: "no commits this session";

	return [
		`## Terminal Recap — ${timeStr}`,
		"",
		`**Worked in:** ${meta.project} / ${meta.branch}`,
		"",
		summary,
		"",
		`**Git:** ${gitLine}`,
		"",
		"---",
		"",
	].join("\n");
}

export function formatContextSummary(meta: SessionMeta, summary: string): string {
	const dateStr = meta.startTime.toISOString().split("T")[0];
	const timeStr = meta.startTime.toTimeString().slice(0, 5);
	return [
		`## Last Claude Session — ${dateStr} ${timeStr}`,
		`**Project:** ${meta.project}  **Branch:** ${meta.branch}  **Duration:** ${meta.durationMin}min`,
		"",
		summary,
		"",
	].join("\n");
}

// ── Vault helpers ─────────────────────────────────────────────────────────────

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	if (!folderPath) return;
	const exists = await app.vault.adapter.exists(folderPath);
	if (!exists) {
		await app.vault.createFolder(folderPath);
	}
}

async function writeOrCreate(app: App, filePath: string, content: string): Promise<void> {
	const folder = filePath.split("/").slice(0, -1).join("/");
	if (folder) await ensureFolder(app, folder);

	const existing = app.vault.getAbstractFileByPath(filePath);
	if (existing instanceof TFile) {
		await app.vault.modify(existing, content);
	} else {
		await app.vault.create(filePath, content);
	}
}

async function appendToFile(app: App, filePath: string, content: string): Promise<void> {
	const folder = filePath.split("/").slice(0, -1).join("/");
	if (folder) await ensureFolder(app, folder);

	const existing = app.vault.getAbstractFileByPath(filePath);
	if (existing instanceof TFile) {
		const current = await app.vault.read(existing);
		await app.vault.modify(existing, current + "\n" + content);
	} else {
		await app.vault.create(filePath, content);
	}
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function processQueueFile(
	app: App,
	settings: ClaudeSessionsSettings,
	queueFilePath: string,
	appendedSessions: Set<string>,
	errorLog: (msg: string) => void
): Promise<void> {
	// Wait briefly in case the file is still being written
	await new Promise((r) => setTimeout(r, 500));

	let raw: string;
	try {
		raw = await app.vault.adapter.read(queueFilePath);
	} catch (e) {
		errorLog(`Failed to read queue file ${queueFilePath}: ${e}`);
		return;
	}

	const entries = parseTranscript(raw);
	if (entries.length === 0) {
		await safeRemove(app, queueFilePath, errorLog);
		return;
	}

	// Extract session ID from filename: YYYYMMDD-HHMMSS-{sessionId}.jsonl
	const filename = queueFilePath.split("/").pop() ?? "";
	const sessionId = filename.replace(/^\d{8}-\d{6}-/, "").replace(/\.jsonl$/, "") || "unknown";

	const meta = extractMeta(entries, sessionId);

	if (shouldSkip(meta, settings)) {
		await safeRemove(app, queueFilePath, errorLog);
		return;
	}

	let summary: string;
	try {
		summary = await generateAISummary(meta, settings);
		summary = redactSecrets(summary);
	} catch (e) {
		errorLog(`AI summary failed, using mechanical: ${e}`);
		summary = redactSecrets(buildMechanicalSummary(meta));
	}

	// Write session note
	try {
		const dateStr = meta.startTime.toISOString().split("T")[0];
		const timeStr = meta.startTime.toTimeString().slice(0, 5).replace(":", "");
		const notePath = `${settings.sessionsFolder}/${dateStr}-${timeStr}-${meta.project}.md`;
		await writeOrCreate(app, notePath, formatSessionNote(meta, summary));
	} catch (e) {
		errorLog(`Failed to write session note: ${e}`);
	}

	// Append to daily note (once per session)
	if (settings.appendToDailyNote && !appendedSessions.has(sessionId)) {
		try {
			const dateStr = meta.startTime.toISOString().split("T")[0];
			const dailyPath = `${settings.dailyNoteFolder}/${dateStr}.md`;
			await appendToFile(app, dailyPath, formatDailyRecap(meta, summary));
			appendedSessions.add(sessionId);
		} catch (e) {
			errorLog(`Failed to append to daily note: ${e}`);
		}
	}

	// Write context file for SessionStart injection
	if (settings.injectContextEnabled) {
		try {
			await writeOrCreate(app, settings.contextFile, formatContextSummary(meta, summary));
		} catch (e) {
			errorLog(`Failed to write context file: ${e}`);
		}
	}

	// Remove processed queue file
	await safeRemove(app, queueFilePath, errorLog);
}

async function safeRemove(app: App, path: string, errorLog: (msg: string) => void): Promise<void> {
	try {
		const file = app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) await app.vault.delete(file);
	} catch (e) {
		errorLog(`Failed to delete queue file ${path}: ${e}`);
	}
}
