import { execFileSync } from "child_process";

// Sentinel stored in data.json instead of the real key
export const KEYCHAIN_SENTINEL = "__keychain__";

const ACCOUNT = "obsidian-claude-sessions";

function serviceName(provider: "anthropic" | "openrouter"): string {
	return `claude-sessions-${provider}`;
}

/** Save an API key to macOS Keychain. Returns true on success. */
export function keychainSave(provider: "anthropic" | "openrouter", key: string): boolean {
	try {
		// -U updates if already exists
		execFileSync("security", [
			"add-generic-password",
			"-U",
			"-s", serviceName(provider),
			"-a", ACCOUNT,
			"-w", key,
		], { stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

/** Load an API key from macOS Keychain. Returns empty string if not found. */
export function keychainLoad(provider: "anthropic" | "openrouter"): string {
	try {
		const result = execFileSync("security", [
			"find-generic-password",
			"-s", serviceName(provider),
			"-a", ACCOUNT,
			"-w",
		], { stdio: "pipe" });
		return result.toString().trim();
	} catch {
		return "";
	}
}

/** Delete a key from Keychain (e.g. when user clears the field). */
export function keychainDelete(provider: "anthropic" | "openrouter"): void {
	try {
		execFileSync("security", [
			"delete-generic-password",
			"-s", serviceName(provider),
			"-a", ACCOUNT,
		], { stdio: "pipe" });
	} catch {
		// Not found — fine
	}
}

/** Resolve a settings key value: if it's the sentinel, load from Keychain. */
export function resolveKey(provider: "anthropic" | "openrouter", storedValue: string): string {
	if (storedValue === KEYCHAIN_SENTINEL) {
		return keychainLoad(provider);
	}
	return storedValue;
}
