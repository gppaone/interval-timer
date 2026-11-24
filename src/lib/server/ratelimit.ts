// Tiny in-memory login throttle, keyed by email. State resets when the server
// restarts, which is fine for a single-process private app.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

const failures = new Map<string, { count: number; resetAt: number }>();

function current(key: string) {
	const entry = failures.get(key);
	if (entry && entry.resetAt <= Date.now()) {
		failures.delete(key);
		return undefined;
	}
	return entry;
}

export function isLimited(key: string): boolean {
	return (current(key)?.count ?? 0) >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
	const entry = current(key);
	if (entry) {
		entry.count += 1;
	} else {
		failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
	}
}

export function clearFailures(key: string): void {
	failures.delete(key);
}
