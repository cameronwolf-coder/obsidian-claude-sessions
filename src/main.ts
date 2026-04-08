import { Notice, Plugin, TFile } from "obsidian";
import { ClaudeSessionsSettingTab, DEFAULT_SETTINGS } from "./settings";
import { processQueueFile } from "./processor";
import type { ClaudeSessionsSettings } from "./types";
import { KEYCHAIN_SENTINEL, resolveKey } from "./keychain";

export default class ClaudeSessionsPlugin extends Plugin {
	settings: ClaudeSessionsSettings;

	// In-memory dedup: tracks session IDs already appended to today's daily note
	private appendedSessions = new Set<string>();
	// Track queue files currently being processed (prevent double-processing)
	private processing = new Set<string>();

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ClaudeSessionsSettingTab(this.app, this));

		// Ensure queue folder exists
		await this.ensureQueueFolder();

		// Watch for new files dropped into the queue folder
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (!(file instanceof TFile)) return;
				if (!this.settings.enabled) return;
				if (!this.isQueueFile(file.path)) return;
				this.scheduleProcess(file.path);
			})
		);

		// Process any queue files that arrived while Obsidian was closed
		this.app.workspace.onLayoutReady(() => {
			this.drainQueue();
		});

		// Reset dedup set at midnight
		this.registerInterval(
			window.setInterval(() => {
				const now = new Date();
				if (now.getHours() === 0 && now.getMinutes() < 1) {
					this.appendedSessions.clear();
				}
			}, 60_000)
		);

		console.log("Claude Sessions: loaded");
	}

	onunload() {
		console.log("Claude Sessions: unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// ── Queue management ────────────────────────────────────────────────────────

	private isQueueFile(path: string): boolean {
		return (
			path.startsWith(this.settings.queueFolder + "/") &&
			path.endsWith(".jsonl")
		);
	}

	private scheduleProcess(path: string) {
		// Debounce: wait 600ms to avoid double-trigger from rapid file events
		setTimeout(() => this.processFile(path), 600);
	}

	async drainQueue(): Promise<void> {
		if (!this.settings.enabled) return;
		const files = this.app.vault
			.getFiles()
			.filter((f) => this.isQueueFile(f.path));
		for (const file of files) {
			await this.processFile(file.path);
		}
	}

	private async processFile(path: string): Promise<void> {
		if (this.processing.has(path)) return;
		this.processing.add(path);
		try {
			await processQueueFile(
				this.app,
				this.settings,
				path,
				this.appendedSessions,
				(msg) => this.logError(msg)
			);
		} catch (e) {
			this.logError(`Unhandled error processing ${path}: ${e}`);
			new Notice(`Claude Sessions: error processing queue file. Check error log.`);
		} finally {
			this.processing.delete(path);
		}
	}

	// ── Self-test ────────────────────────────────────────────────────────────────

	async runSelfTest(): Promise<{ ok: boolean; message: string }> {
		const checks: string[] = [];
		let ok = true;

		// Check queue folder
		const queueExists = await this.app.vault.adapter.exists(this.settings.queueFolder);
		if (queueExists) {
			checks.push(`✓ Queue folder exists: ${this.settings.queueFolder}`);
		} else {
			checks.push(`✗ Queue folder missing: ${this.settings.queueFolder}`);
			ok = false;
		}

		// Check sessions folder
		const sessionsExists = await this.app.vault.adapter.exists(this.settings.sessionsFolder);
		if (sessionsExists) {
			checks.push(`✓ Sessions folder exists: ${this.settings.sessionsFolder}`);
		} else {
			checks.push(`⚠ Sessions folder will be created on first save: ${this.settings.sessionsFolder}`);
		}

		// Check daily note folder
		const dailyExists = await this.app.vault.adapter.exists(this.settings.dailyNoteFolder);
		if (dailyExists) {
			checks.push(`✓ Daily note folder exists: ${this.settings.dailyNoteFolder}`);
		} else {
			checks.push(`✗ Daily note folder missing: ${this.settings.dailyNoteFolder}`);
			ok = false;
		}

		// Check AI provider + key (resolve from Keychain if needed)
		if (this.settings.aiProvider === "anthropic") {
			const key = resolveKey("anthropic", this.settings.anthropicApiKey);
			const inKeychain = this.settings.anthropicApiKey === KEYCHAIN_SENTINEL;
			if (key.startsWith("sk-ant-")) {
				checks.push(`✓ Anthropic API key set${inKeychain ? " (Keychain)" : ""} — format valid`);
			} else if (key) {
				checks.push(`⚠ Anthropic key format unexpected (expected sk-ant-...)`);
			} else {
				checks.push(`⚠ No Anthropic API key — will use mechanical summaries`);
			}
		} else if (this.settings.aiProvider === "openrouter") {
			const key = resolveKey("openrouter", this.settings.openRouterApiKey);
			const inKeychain = this.settings.openRouterApiKey === KEYCHAIN_SENTINEL;
			if (key) {
				checks.push(`✓ OpenRouter API key set${inKeychain ? " (Keychain)" : ""} (model: ${this.settings.openRouterModel})`);
			} else {
				checks.push(`⚠ No OpenRouter API key — will use mechanical summaries`);
			}
		} else {
			checks.push(`○ AI provider disabled — using mechanical extraction`);
		}

		return { ok, message: checks.join("\n") };
	}

	// ── Helpers ──────────────────────────────────────────────────────────────────

	private async ensureQueueFolder(): Promise<void> {
		try {
			const exists = await this.app.vault.adapter.exists(this.settings.queueFolder);
			if (!exists) await this.app.vault.createFolder(this.settings.queueFolder);
		} catch {
			// Best-effort
		}
	}

	private async logError(msg: string): Promise<void> {
		const logPath = "_System/claude-sessions-errors.log";
		const timestamp = new Date().toISOString();
		const line = `${timestamp} ${msg}\n`;
		try {
			const folder = logPath.split("/").slice(0, -1).join("/");
			if (folder) {
				const folderExists = await this.app.vault.adapter.exists(folder);
				if (!folderExists) await this.app.vault.createFolder(folder);
			}
			const existing = this.app.vault.getAbstractFileByPath(logPath);
			if (existing instanceof TFile) {
				const current = await this.app.vault.read(existing);
				await this.app.vault.modify(existing, current + line);
			} else {
				await this.app.vault.create(logPath, line);
			}
		} catch {
			console.error("Claude Sessions:", msg);
		}
	}
}
