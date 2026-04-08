var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ClaudeSessionsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
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
  injectContextEnabled: true
};
var ClaudeSessionsSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Claude Sessions" });
    containerEl.createEl("p", {
      text: "Auto-saves Claude Code session context to your daily notes and a sessions archive.",
      cls: "claude-sessions-status"
    });
    new import_obsidian.Setting(containerEl).setName("Enable").setDesc("Master on/off switch. When disabled, queued files are left unprocessed.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
        this.plugin.settings.enabled = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Folders" });
    new import_obsidian.Setting(containerEl).setName("Sessions folder").setDesc("Where to drop session notes. Defaults to 00-Inbox so the sorter agent can file them.").addText(
      (text) => text.setPlaceholder("00-Inbox").setValue(this.plugin.settings.sessionsFolder).onChange(async (value) => {
        this.plugin.settings.sessionsFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Daily notes folder").setDesc("Folder containing your daily notes (YYYY-MM-DD.md).").addText(
      (text) => text.setPlaceholder("07-Daily").setValue(this.plugin.settings.dailyNoteFolder).onChange(async (value) => {
        this.plugin.settings.dailyNoteFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Queue folder").setDesc("Inbox folder where the Claude Code hook drops raw transcripts.").addText(
      (text) => text.setPlaceholder("_System/claude-import-queue").setValue(this.plugin.settings.queueFolder).onChange(async (value) => {
        this.plugin.settings.queueFolder = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Context file").setDesc("Path for the latest-session summary injected at Claude Code session start.").addText(
      (text) => text.setPlaceholder("_System/claude-context/latest.md").setValue(this.plugin.settings.contextFile).onChange(async (value) => {
        this.plugin.settings.contextFile = value.trim();
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Daily Note" });
    new import_obsidian.Setting(containerEl).setName("Append Terminal Recap to daily note").setDesc("Adds a '## Terminal Recap \u2014 HH:MM' section to today's daily note after each session.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.appendToDailyNote).onChange(async (value) => {
        this.plugin.settings.appendToDailyNote = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "AI Summary" });
    new import_obsidian.Setting(containerEl).setName("AI provider").setDesc("Which API to use for generating narrative summaries. 'Disabled' uses mechanical extraction.").addDropdown(
      (drop) => drop.addOption("anthropic", "Anthropic (direct)").addOption("openrouter", "OpenRouter").addOption("disabled", "Disabled \u2014 mechanical only").setValue(this.plugin.settings.aiProvider).onChange(async (value) => {
        this.plugin.settings.aiProvider = value;
        await this.plugin.saveSettings();
        this.display();
      })
    );
    if (this.plugin.settings.aiProvider === "anthropic") {
      new import_obsidian.Setting(containerEl).setName("Anthropic API key").setDesc("Your Anthropic API key (sk-ant-...). Stored in Obsidian plugin data.").addText((text) => {
        text.setPlaceholder("sk-ant-api03-...").setValue(this.plugin.settings.anthropicApiKey).onChange(async (value) => {
          this.plugin.settings.anthropicApiKey = value.trim();
          await this.plugin.saveSettings();
        });
        text.inputEl.type = "password";
        text.inputEl.style.width = "100%";
      });
      new import_obsidian.Setting(containerEl).setName("Anthropic model").setDesc("Model ID to use, e.g. claude-haiku-4-5-20251001 or claude-sonnet-4-6.").addText(
        (text) => text.setPlaceholder("claude-haiku-4-5-20251001").setValue(this.plugin.settings.aiModel).onChange(async (value) => {
          this.plugin.settings.aiModel = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
    if (this.plugin.settings.aiProvider === "openrouter") {
      new import_obsidian.Setting(containerEl).setName("OpenRouter API key").setDesc("Your OpenRouter API key. Stored in Obsidian plugin data.").addText((text) => {
        text.setPlaceholder("sk-or-...").setValue(this.plugin.settings.openRouterApiKey).onChange(async (value) => {
          this.plugin.settings.openRouterApiKey = value.trim();
          await this.plugin.saveSettings();
        });
        text.inputEl.type = "password";
        text.inputEl.style.width = "100%";
      });
      new import_obsidian.Setting(containerEl).setName("OpenRouter model").setDesc("Any model slug from openrouter.ai/models, e.g. anthropic/claude-haiku-4 or openai/gpt-4o-mini.").addText(
        (text) => text.setPlaceholder("anthropic/claude-haiku-4").setValue(this.plugin.settings.openRouterModel).onChange(async (value) => {
          this.plugin.settings.openRouterModel = value.trim();
          await this.plugin.saveSettings();
        })
      );
    }
    containerEl.createEl("h3", { text: "Session Filters" });
    containerEl.createEl("p", {
      text: "Sessions are skipped if BOTH conditions are below the thresholds (short AND low-activity sessions).",
      cls: "claude-sessions-status"
    });
    new import_obsidian.Setting(containerEl).setName("Minimum tool calls").setDesc("Skip sessions with fewer than this many tool calls.").addSlider(
      (slider) => slider.setLimits(0, 20, 1).setValue(this.plugin.settings.minToolCalls).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.minToolCalls = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Minimum duration (minutes)").setDesc("Skip sessions shorter than this duration.").addSlider(
      (slider) => slider.setLimits(0, 30, 1).setValue(this.plugin.settings.minDurationMin).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.minDurationMin = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Context Injection" });
    new import_obsidian.Setting(containerEl).setName("Write context file for session start").setDesc("After each session, writes a summary to the context file. The inject-context.sh hook reads this at the start of every new Claude Code session.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.injectContextEnabled).onChange(async (value) => {
        this.plugin.settings.injectContextEnabled = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Status" });
    const statusEl = containerEl.createDiv({ cls: "claude-sessions-status" });
    const updateStatus = async () => {
      const queuePath = this.plugin.settings.queueFolder;
      try {
        const files = this.app.vault.getFiles().filter(
          (f) => f.path.startsWith(queuePath + "/") && f.extension === "jsonl"
        );
        statusEl.setText(`Queue: ${files.length} file(s) pending`);
      } catch (e) {
        statusEl.setText("Queue: unable to read");
      }
    };
    updateStatus();
    new import_obsidian.Setting(containerEl).setName("Process queue now").setDesc("Manually trigger processing of any pending queue files.").addButton(
      (btn) => btn.setButtonText("Process queue").onClick(async () => {
        await this.plugin.drainQueue();
        await updateStatus();
        new import_obsidian.Notice("Queue processed.");
      })
    );
    new import_obsidian.Setting(containerEl).setName("Test connection").setDesc("Verify the API key and vault folders are configured correctly.").addButton((btn) => {
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
};

// src/processor.ts
var import_obsidian2 = require("obsidian");
function parseTranscript(raw) {
  const entries = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    try {
      entries.push(JSON.parse(trimmed));
    } catch (e) {
    }
  }
  return entries;
}
function extractMeta(entries, sessionId) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const timestamps = entries.map((e) => e.timestamp).filter((t) => !!t).map((t) => new Date(t).getTime()).filter((t) => !isNaN(t));
  const startMs = timestamps.length ? Math.min(...timestamps) : Date.now();
  const endMs = timestamps.length ? Math.max(...timestamps) : Date.now();
  const startTime = new Date(startMs);
  const endTime = new Date(endMs);
  const durationMin = Math.round((endMs - startMs) / 6e4);
  const cwdEntry = entries.find((e) => e.cwd);
  const cwd = (_a = cwdEntry == null ? void 0 : cwdEntry.cwd) != null ? _a : "";
  const project = cwd ? (_b = cwd.split("/").pop()) != null ? _b : cwd : "unknown";
  const branch = (_e = (_d = cwdEntry == null ? void 0 : cwdEntry.gitBranch) != null ? _d : (_c = entries.find((e) => e.gitBranch)) == null ? void 0 : _c.gitBranch) != null ? _e : "unknown";
  let toolCallCount = 0;
  const bashCommands = [];
  const filesEdited = [];
  const gitCommits = [];
  for (const entry of entries) {
    const content = (_f = entry.message) == null ? void 0 : _f.content;
    if (!Array.isArray(content))
      continue;
    for (const item of content) {
      if (item.type !== "tool_use")
        continue;
      toolCallCount++;
      const name = (_g = item.name) != null ? _g : "";
      const input = item.input;
      if (name === "Bash" && (input == null ? void 0 : input.command)) {
        const cmd = String(input.command);
        if (!isNoisyCommand(cmd)) {
          bashCommands.push(cmd.split("\n")[0].trim().slice(0, 120));
        }
        if (cmd.includes("git commit")) {
          const msgMatch = cmd.match(/-m\s+["']([^"']+)["']/);
          if (msgMatch)
            gitCommits.push(msgMatch[1]);
        }
      }
      if ((name === "Edit" || name === "Write") && (input == null ? void 0 : input.file_path)) {
        const fp = String(input.file_path);
        const rel = fp.split("/").slice(-2).join("/");
        if (!filesEdited.includes(rel))
          filesEdited.push(rel);
      }
    }
  }
  let firstUserMessage = "";
  for (const entry of entries) {
    if (entry.type !== "user")
      continue;
    const content = (_h = entry.message) == null ? void 0 : _h.content;
    if (!Array.isArray(content))
      continue;
    const textItem = content.find((c) => {
      var _a2;
      return c.type === "text" && ((_a2 = c.text) == null ? void 0 : _a2.trim());
    });
    if (textItem == null ? void 0 : textItem.text) {
      firstUserMessage = textItem.text.trim().slice(0, 300);
      break;
    }
  }
  let lastAssistantText = "";
  for (const entry of [...entries].reverse()) {
    if (entry.type !== "assistant")
      continue;
    const content = (_i = entry.message) == null ? void 0 : _i.content;
    if (!Array.isArray(content))
      continue;
    const textItem = content.find((c) => {
      var _a2;
      return c.type === "text" && ((_a2 = c.text) == null ? void 0 : _a2.trim());
    });
    if (textItem == null ? void 0 : textItem.text) {
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
    lastAssistantText
  };
}
function isNoisyCommand(cmd) {
  const noise = [
    "git status",
    "git log",
    "git diff",
    "git branch",
    "git show",
    "cat ",
    "head ",
    "tail ",
    "ls ",
    "echo ",
    "pwd",
    "which ",
    "grep ",
    "rg ",
    "find "
  ];
  return noise.some((n) => cmd.startsWith(n));
}
function dedupeCommands(cmds) {
  const seen = /* @__PURE__ */ new Set();
  return cmds.filter((c) => {
    const key = c.slice(0, 40);
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
}
function shouldSkip(meta, settings) {
  return meta.toolCallCount < settings.minToolCalls && meta.durationMin < settings.minDurationMin;
}
async function generateAISummary(meta, settings) {
  var _a, _b, _c, _d, _e, _f, _g;
  const prompt = buildSummaryPrompt(meta);
  if (settings.aiProvider === "anthropic" && settings.anthropicApiKey) {
    try {
      const response = await (0, import_obsidian2.requestUrl)({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        headers: {
          "x-api-key": settings.anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: settings.aiModel,
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const text = (_c = (_b = (_a = response.json) == null ? void 0 : _a.content) == null ? void 0 : _b[0]) == null ? void 0 : _c.text;
      if (text == null ? void 0 : text.trim())
        return text.trim();
    } catch (e) {
    }
  } else if (settings.aiProvider === "openrouter" && settings.openRouterApiKey) {
    try {
      const response = await (0, import_obsidian2.requestUrl)({
        url: "https://openrouter.ai/api/v1/chat/completions",
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.openRouterApiKey}`,
          "content-type": "application/json",
          "HTTP-Referer": "obsidian://claude-sessions",
          "X-Title": "Claude Sessions"
        },
        body: JSON.stringify({
          model: settings.openRouterModel,
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const text = (_g = (_f = (_e = (_d = response.json) == null ? void 0 : _d.choices) == null ? void 0 : _e[0]) == null ? void 0 : _f.message) == null ? void 0 : _g.content;
      if (text == null ? void 0 : text.trim())
        return text.trim();
    } catch (e) {
    }
  }
  return buildMechanicalSummary(meta);
}
function buildSummaryPrompt(meta) {
  const contextLines = [
    `Project: ${meta.project} (branch: ${meta.branch})`,
    `Duration: ${meta.durationMin} minutes`,
    `Tool calls: ${meta.toolCallCount}`
  ];
  if (meta.filesEdited.length)
    contextLines.push(`Files edited: ${meta.filesEdited.join(", ")}`);
  if (meta.gitCommits.length)
    contextLines.push(`Git commits: ${meta.gitCommits.join("; ")}`);
  if (meta.bashCommands.length)
    contextLines.push(`Key commands: ${meta.bashCommands.slice(0, 8).join(", ")}`);
  if (meta.firstUserMessage)
    contextLines.push(`Initial task: "${meta.firstUserMessage}"`);
  if (meta.lastAssistantText)
    contextLines.push(`Completion note: "${meta.lastAssistantText.slice(0, 200)}"`);
  const context = contextLines.join("\n");
  return `You are generating a "Terminal Recap" section for an Obsidian daily note.

Session context:
${context}

Write 3\u20136 bullet points summarizing what happened. Rules:
- Past tense, specific and concrete
- Include numbers/metrics when available
- Focus on what was accomplished, not just what was attempted
- Match this style: "Migrated 3,700 historical campaign events from Upstash Redis to Postgres (4 campaigns)"
- If git commits exist, mention them
- Start each bullet with "- "
- No section headers, just bullets`;
}
function buildMechanicalSummary(meta) {
  const lines = [];
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
function redactSecrets(text) {
  return text.replace(/\b(api[_-]?key|token|secret|password|passwd|auth[_-]?key)\s*[=:]\s*\S+/gi, "$1=[REDACTED]").replace(/sk-ant-[A-Za-z0-9_-]{20,}/g, "sk-ant-[REDACTED]").replace(/Bearer\s+[A-Za-z0-9_\-.]{20,}/g, "Bearer [REDACTED]");
}
function buildTags(meta) {
  const tags = ["dev-log/claude-session"];
  if (meta.project && meta.project !== "unknown") {
    const projectTag = meta.project.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    tags.push(`project/${projectTag}`);
  }
  if (meta.gitCommits.length > 0) {
    tags.push("git/committed");
  }
  return tags;
}
function formatSessionNote(meta, summary) {
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
    `tags:
${tagsYaml}`,
    "---"
  ].join("\n");
  const sections = [
    frontmatter,
    "",
    `# Claude Session \u2014 ${meta.project} / ${meta.branch}`,
    `${dateStr} ${timeStr}`,
    "",
    "## Summary",
    summary
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
function formatDailyRecap(meta, summary) {
  const timeStr = meta.startTime.toTimeString().slice(0, 5);
  const gitLine = meta.gitCommits.length ? meta.gitCommits.join("; ") : "no commits this session";
  return [
    `## Terminal Recap \u2014 ${timeStr}`,
    "",
    `**Worked in:** ${meta.project} / ${meta.branch}`,
    "",
    summary,
    "",
    `**Git:** ${gitLine}`,
    "",
    "---",
    ""
  ].join("\n");
}
function formatContextSummary(meta, summary) {
  const dateStr = meta.startTime.toISOString().split("T")[0];
  const timeStr = meta.startTime.toTimeString().slice(0, 5);
  return [
    `## Last Claude Session \u2014 ${dateStr} ${timeStr}`,
    `**Project:** ${meta.project}  **Branch:** ${meta.branch}  **Duration:** ${meta.durationMin}min`,
    "",
    summary,
    ""
  ].join("\n");
}
async function ensureFolder(app, folderPath) {
  if (!folderPath)
    return;
  const exists = await app.vault.adapter.exists(folderPath);
  if (!exists) {
    await app.vault.createFolder(folderPath);
  }
}
async function writeOrCreate(app, filePath, content) {
  const folder = filePath.split("/").slice(0, -1).join("/");
  if (folder)
    await ensureFolder(app, folder);
  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing instanceof import_obsidian2.TFile) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(filePath, content);
  }
}
async function appendToFile(app, filePath, content) {
  const folder = filePath.split("/").slice(0, -1).join("/");
  if (folder)
    await ensureFolder(app, folder);
  const existing = app.vault.getAbstractFileByPath(filePath);
  if (existing instanceof import_obsidian2.TFile) {
    const current = await app.vault.read(existing);
    await app.vault.modify(existing, current + "\n" + content);
  } else {
    await app.vault.create(filePath, content);
  }
}
async function processQueueFile(app, settings, queueFilePath, appendedSessions, errorLog) {
  var _a;
  await new Promise((r) => setTimeout(r, 500));
  let raw;
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
  const filename = (_a = queueFilePath.split("/").pop()) != null ? _a : "";
  const sessionId = filename.replace(/^\d{8}-\d{6}-/, "").replace(/\.jsonl$/, "") || "unknown";
  const meta = extractMeta(entries, sessionId);
  if (shouldSkip(meta, settings)) {
    await safeRemove(app, queueFilePath, errorLog);
    return;
  }
  let summary;
  try {
    summary = await generateAISummary(meta, settings);
    summary = redactSecrets(summary);
  } catch (e) {
    errorLog(`AI summary failed, using mechanical: ${e}`);
    summary = redactSecrets(buildMechanicalSummary(meta));
  }
  try {
    const dateStr = meta.startTime.toISOString().split("T")[0];
    const timeStr = meta.startTime.toTimeString().slice(0, 5).replace(":", "");
    const notePath = `${settings.sessionsFolder}/${dateStr}-${timeStr}-${meta.project}.md`;
    await writeOrCreate(app, notePath, formatSessionNote(meta, summary));
  } catch (e) {
    errorLog(`Failed to write session note: ${e}`);
  }
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
  if (settings.injectContextEnabled) {
    try {
      await writeOrCreate(app, settings.contextFile, formatContextSummary(meta, summary));
    } catch (e) {
      errorLog(`Failed to write context file: ${e}`);
    }
  }
  await safeRemove(app, queueFilePath, errorLog);
}
async function safeRemove(app, path, errorLog) {
  try {
    const file = app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian2.TFile)
      await app.vault.delete(file);
  } catch (e) {
    errorLog(`Failed to delete queue file ${path}: ${e}`);
  }
}

// src/main.ts
var ClaudeSessionsPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    // In-memory dedup: tracks session IDs already appended to today's daily note
    this.appendedSessions = /* @__PURE__ */ new Set();
    // Track queue files currently being processed (prevent double-processing)
    this.processing = /* @__PURE__ */ new Set();
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ClaudeSessionsSettingTab(this.app, this));
    await this.ensureQueueFolder();
    this.registerEvent(
      this.app.vault.on("create", (file) => {
        if (!(file instanceof import_obsidian3.TFile))
          return;
        if (!this.settings.enabled)
          return;
        if (!this.isQueueFile(file.path))
          return;
        this.scheduleProcess(file.path);
      })
    );
    this.app.workspace.onLayoutReady(() => {
      this.drainQueue();
    });
    this.registerInterval(
      window.setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() < 1) {
          this.appendedSessions.clear();
        }
      }, 6e4)
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
  isQueueFile(path) {
    return path.startsWith(this.settings.queueFolder + "/") && path.endsWith(".jsonl");
  }
  scheduleProcess(path) {
    setTimeout(() => this.processFile(path), 600);
  }
  async drainQueue() {
    if (!this.settings.enabled)
      return;
    const files = this.app.vault.getFiles().filter((f) => this.isQueueFile(f.path));
    for (const file of files) {
      await this.processFile(file.path);
    }
  }
  async processFile(path) {
    if (this.processing.has(path))
      return;
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
      new import_obsidian3.Notice(`Claude Sessions: error processing queue file. Check error log.`);
    } finally {
      this.processing.delete(path);
    }
  }
  // ── Self-test ────────────────────────────────────────────────────────────────
  async runSelfTest() {
    const checks = [];
    let ok = true;
    const queueExists = await this.app.vault.adapter.exists(this.settings.queueFolder);
    if (queueExists) {
      checks.push(`\u2713 Queue folder exists: ${this.settings.queueFolder}`);
    } else {
      checks.push(`\u2717 Queue folder missing: ${this.settings.queueFolder}`);
      ok = false;
    }
    const sessionsExists = await this.app.vault.adapter.exists(this.settings.sessionsFolder);
    if (sessionsExists) {
      checks.push(`\u2713 Sessions folder exists: ${this.settings.sessionsFolder}`);
    } else {
      checks.push(`\u26A0 Sessions folder will be created on first save: ${this.settings.sessionsFolder}`);
    }
    const dailyExists = await this.app.vault.adapter.exists(this.settings.dailyNoteFolder);
    if (dailyExists) {
      checks.push(`\u2713 Daily note folder exists: ${this.settings.dailyNoteFolder}`);
    } else {
      checks.push(`\u2717 Daily note folder missing: ${this.settings.dailyNoteFolder}`);
      ok = false;
    }
    if (this.settings.aiProvider === "anthropic") {
      if (this.settings.anthropicApiKey.startsWith("sk-ant-")) {
        checks.push(`\u2713 Anthropic API key set (format looks valid)`);
      } else if (this.settings.anthropicApiKey) {
        checks.push(`\u26A0 Anthropic API key set but format unexpected (expected sk-ant-...)`);
      } else {
        checks.push(`\u26A0 No Anthropic API key \u2014 will use mechanical summaries`);
      }
    } else if (this.settings.aiProvider === "openrouter") {
      if (this.settings.openRouterApiKey) {
        checks.push(`\u2713 OpenRouter API key set (model: ${this.settings.openRouterModel})`);
      } else {
        checks.push(`\u26A0 No OpenRouter API key \u2014 will use mechanical summaries`);
      }
    } else {
      checks.push(`\u25CB AI provider disabled \u2014 using mechanical extraction`);
    }
    return { ok, message: checks.join("\n") };
  }
  // ── Helpers ──────────────────────────────────────────────────────────────────
  async ensureQueueFolder() {
    try {
      const exists = await this.app.vault.adapter.exists(this.settings.queueFolder);
      if (!exists)
        await this.app.vault.createFolder(this.settings.queueFolder);
    } catch (e) {
    }
  }
  async logError(msg) {
    const logPath = "_System/claude-sessions-errors.log";
    const timestamp = new Date().toISOString();
    const line = `${timestamp} ${msg}
`;
    try {
      const folder = logPath.split("/").slice(0, -1).join("/");
      if (folder) {
        const folderExists = await this.app.vault.adapter.exists(folder);
        if (!folderExists)
          await this.app.vault.createFolder(folder);
      }
      const existing = this.app.vault.getAbstractFileByPath(logPath);
      if (existing instanceof import_obsidian3.TFile) {
        const current = await this.app.vault.read(existing);
        await this.app.vault.modify(existing, current + line);
      } else {
        await this.app.vault.create(logPath, line);
      }
    } catch (e) {
      console.error("Claude Sessions:", msg);
    }
  }
};
