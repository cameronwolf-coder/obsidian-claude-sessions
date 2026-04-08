export interface TranscriptContentItem {
	type: string;
	text?: string;
	name?: string;
	input?: Record<string, unknown>;
	content?: unknown;
}

export interface TranscriptMessage {
	role?: string;
	content?: TranscriptContentItem[];
}

export interface TranscriptEntry {
	type: string;
	message?: TranscriptMessage;
	cwd?: string;
	gitBranch?: string;
	timestamp?: string;
	sessionId?: string;
}

export interface SessionMeta {
	sessionId: string;
	cwd: string;
	project: string;
	branch: string;
	startTime: Date;
	endTime: Date;
	durationMin: number;
	toolCallCount: number;
	filesEdited: string[];
	bashCommands: string[];
	gitCommits: string[];
	firstUserMessage: string;
	lastAssistantText: string;
}

export interface ClaudeSessionsSettings {
	enabled: boolean;
	sessionsFolder: string;
	dailyNoteFolder: string;
	appendToDailyNote: boolean;
	aiProvider: "anthropic" | "openrouter" | "disabled";
	anthropicApiKey: string;
	aiModel: string;
	openRouterApiKey: string;
	openRouterModel: string;
	minToolCalls: number;
	minDurationMin: number;
	queueFolder: string;
	contextFile: string;
	injectContextEnabled: boolean;
}
