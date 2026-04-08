import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ClaudeSessionsPlugin from "./main";
import type { ClaudeSessionsSettings } from "./types";

export const DEFAULT_SETTINGS: ClaudeSessionsSettings = {
	enabled: true,
	sessionsFolder: "00-Inbox",
	dailyNoteFolder: "07-Daily",
	appendToDailyNote: true,
	aiProvider: "anthropic",
	anthropicApiKey: "",
	aiModel: "claude-haiku-4-5-20251001",
	openRouterApiKey: "",
	openRouterModel: "anthropic/claude-haiku-4",
	minToolCalls: 3,
	minDurationMin: 3,
	queueFolder: "_System/claude-import-queue",
	contextFile: "_System/claude-context/latest.md",
	injectContextEnabled: true,
};

export class ClaudeSessionsSettingTab extends PluginSettingTab {
	plugin: ClaudeSessionsPlugin;

	constructor(app: App, plugin: ClaudeSessionsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Header ──────────────────────────────────────────────────
		containerEl.createEl("h2", { text: "Claude Sessions" });
		containerEl.createEl("p", {
			text: "Auto-saves Claude Code session context to your daily notes and a sessions archive.",
			cls: "claude-sessions-status",
		});

		// ── Master toggle ────────────────────────────────────────────
		new Setting(containerEl)
			.setName("Enable")
			.setDesc("Master on/off switch. When disabled, queued files are left unprocessed.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
					})
			);

		// ── Folders ──────────────────────────────────────────────────
		containerEl.createEl("h3", { text: "Folders" });

		new Setting(containerEl)
			.setName("Sessions folder")
			.setDesc("Where to drop session notes. Defaults to 00-Inbox so the sorter agent can file them.")
			.addText((text) =>
				text
					.setPlaceholder("00-Inbox")
					.setValue(this.plugin.settings.sessionsFolder)
					.onChange(async (value) => {
						this.plugin.settings.sessionsFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Daily notes folder")
			.setDesc("Folder containing your daily notes (YYYY-MM-DD.md).")
			.addText((text) =>
				text
					.setPlaceholder("07-Daily")
					.setValue(this.plugin.settings.dailyNoteFolder)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Queue folder")
			.setDesc("Inbox folder where the Claude Code hook drops raw transcripts.")
			.addText((text) =>
				text
					.setPlaceholder("_System/claude-import-queue")
					.setValue(this.plugin.settings.queueFolder)
					.onChange(async (value) => {
						this.plugin.settings.queueFolder = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Context file")
			.setDesc("Path for the latest-session summary injected at Claude Code session start.")
			.addText((text) =>
				text
					.setPlaceholder("_System/claude-context/latest.md")
					.setValue(this.plugin.settings.contextFile)
					.onChange(async (value) => {
						this.plugin.settings.contextFile = value.trim();
						await this.plugin.saveSettings();
					})
			);

		// ── Daily note ───────────────────────────────────────────────
		containerEl.createEl("h3", { text: "Daily Note" });

		new Setting(containerEl)
			.setName("Append Terminal Recap to daily note")
			.setDesc("Adds a '## Terminal Recap — HH:MM' section to today's daily note after each session.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.appendToDailyNote)
					.onChange(async (value) => {
						this.plugin.settings.appendToDailyNote = value;
						await this.plugin.saveSettings();
					})
			);

		// ── AI Summary ───────────────────────────────────────────────
		containerEl.createEl("h3", { text: "AI Summary" });

		new Setting(containerEl)
			.setName("AI provider")
			.setDesc("Which API to use for generating narrative summaries. 'Disabled' uses mechanical extraction.")
			.addDropdown((drop) =>
				drop
					.addOption("anthropic", "Anthropic (direct)")
					.addOption("openrouter", "OpenRouter")
					.addOption("disabled", "Disabled — mechanical only")
					.setValue(this.plugin.settings.aiProvider)
					.onChange(async (value) => {
						this.plugin.settings.aiProvider = value as ClaudeSessionsSettings["aiProvider"];
						await this.plugin.saveSettings();
						// Re-render to show/hide provider-specific fields
						this.display();
					})
			);

		if (this.plugin.settings.aiProvider === "anthropic") {
			new Setting(containerEl)
				.setName("Anthropic API key")
				.setDesc("Your Anthropic API key (sk-ant-...). Stored in Obsidian plugin data.")
				.addText((text) => {
					text
						.setPlaceholder("sk-ant-api03-...")
						.setValue(this.plugin.settings.anthropicApiKey)
						.onChange(async (value) => {
							this.plugin.settings.anthropicApiKey = value.trim();
							await this.plugin.saveSettings();
						});
					text.inputEl.type = "password";
					text.inputEl.style.width = "100%";
				});

			new Setting(containerEl)
				.setName("Anthropic model")
				.setDesc("Model ID to use, e.g. claude-haiku-4-5-20251001 or claude-sonnet-4-6.")
				.addText((text) =>
					text
						.setPlaceholder("claude-haiku-4-5-20251001")
						.setValue(this.plugin.settings.aiModel)
						.onChange(async (value) => {
							this.plugin.settings.aiModel = value.trim();
							await this.plugin.saveSettings();
						})
				);
		}

		if (this.plugin.settings.aiProvider === "openrouter") {
			new Setting(containerEl)
				.setName("OpenRouter API key")
				.setDesc("Your OpenRouter API key. Stored in Obsidian plugin data.")
				.addText((text) => {
					text
						.setPlaceholder("sk-or-...")
						.setValue(this.plugin.settings.openRouterApiKey)
						.onChange(async (value) => {
							this.plugin.settings.openRouterApiKey = value.trim();
							await this.plugin.saveSettings();
						});
					text.inputEl.type = "password";
					text.inputEl.style.width = "100%";
				});

			new Setting(containerEl)
				.setName("OpenRouter model")
				.setDesc("Any model slug from openrouter.ai/models, e.g. anthropic/claude-haiku-4 or openai/gpt-4o-mini.")
				.addText((text) =>
					text
						.setPlaceholder("anthropic/claude-haiku-4")
						.setValue(this.plugin.settings.openRouterModel)
						.onChange(async (value) => {
							this.plugin.settings.openRouterModel = value.trim();
							await this.plugin.saveSettings();
						})
				);
		}

		// ── Filters ──────────────────────────────────────────────────
		containerEl.createEl("h3", { text: "Session Filters" });
		containerEl.createEl("p", {
			text: "Sessions are skipped if BOTH conditions are below the thresholds (short AND low-activity sessions).",
			cls: "claude-sessions-status",
		});

		new Setting(containerEl)
			.setName("Minimum tool calls")
			.setDesc("Skip sessions with fewer than this many tool calls.")
			.addSlider((slider) =>
				slider
					.setLimits(0, 20, 1)
					.setValue(this.plugin.settings.minToolCalls)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.minToolCalls = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Minimum duration (minutes)")
			.setDesc("Skip sessions shorter than this duration.")
			.addSlider((slider) =>
				slider
					.setLimits(0, 30, 1)
					.setValue(this.plugin.settings.minDurationMin)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.minDurationMin = value;
						await this.plugin.saveSettings();
					})
			);

		// ── Context injection ────────────────────────────────────────
		containerEl.createEl("h3", { text: "Context Injection" });

		new Setting(containerEl)
			.setName("Write context file for session start")
			.setDesc("After each session, writes a summary to the context file. The inject-context.sh hook reads this at the start of every new Claude Code session.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.injectContextEnabled)
					.onChange(async (value) => {
						this.plugin.settings.injectContextEnabled = value;
						await this.plugin.saveSettings();
					})
			);

		// ── Status & Test ─────────────────────────────────────────────
		containerEl.createEl("h3", { text: "Status" });

		const statusEl = containerEl.createDiv({ cls: "claude-sessions-status" });

		const updateStatus = async () => {
			const queuePath = this.plugin.settings.queueFolder;
			try {
				const files = this.app.vault.getFiles().filter(
					(f) => f.path.startsWith(queuePath + "/") && f.extension === "jsonl"
				);
				statusEl.setText(`Queue: ${files.length} file(s) pending`);
			} catch {
				statusEl.setText("Queue: unable to read");
			}
		};

		updateStatus();

		new Setting(containerEl)
			.setName("Process queue now")
			.setDesc("Manually trigger processing of any pending queue files.")
			.addButton((btn) =>
				btn
					.setButtonText("Process queue")
					.onClick(async () => {
						await this.plugin.drainQueue();
						await updateStatus();
						new Notice("Queue processed.");
					})
			);

		new Setting(containerEl)
			.setName("Test connection")
			.setDesc("Verify the API key and vault folders are configured correctly.")
			.addButton((btn) => {
				const resultEl = containerEl.createDiv({ cls: "claude-sessions-test-result" });
				btn.setButtonText("Run test").onClick(async () => {
					btn.setDisabled(true);
					btn.setButtonText("Testing...");
					resultEl.removeClass("success", "error");
					resultEl.setText("");
					try {
						const result = await this.plugin.runSelfTest();
						resultEl.addClass(result.ok ? "success" : "error");
						resultEl.setText(result.message);
					} catch (e) {
						resultEl.addClass("error");
						resultEl.setText("Test failed: " + String(e));
					} finally {
						btn.setDisabled(false);
						btn.setButtonText("Run test");
					}
				});
			});
	}
}
