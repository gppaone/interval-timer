import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '$lib/db';

export const SESSION_COOKIE = 'timer_session';

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_LIFETIME_MS = 30 * DAY_MS;
// Sessions are extended whenever they are used after this much of the
// lifetime has passed, so regular users stay signed in.
const REFRESH_AFTER_MS = 15 * DAY_MS;

export type SessionUser = { id: number; email: string; isAdmin: boolean };

// Only a hash of the token is stored, so a copy of the database cannot be used
// to sign in.
function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

// Scope the cookie to the app's subfolder so it is not sent to other apps
// hosted on the same domain.
function cookiePath(): string {
	return resolve('/').replace(/\/$/, '') || '/';
}

export async function createSession(userId: number) {
	// Opportunistic cleanup of expired sessions.
	await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });

	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
	await db.session.create({ data: { id: hashToken(token), userId, expiresAt } });
	return { token, expiresAt };
}

export async function validateSession(
	token: string
): Promise<{ user: SessionUser; expiresAt: Date; refreshed: boolean } | null> {
	const id = hashToken(token);
	const session = await db.session.findUnique({
		where: { id },
		include: { user: { select: { id: true, email: true, isAdmin: true } } }
	});
	if (!session) return null;

	if (session.expiresAt.getTime() <= Date.now()) {
		await db.session.delete({ where: { id } }).catch(() => {});
		return null;
	}

	let expiresAt = session.expiresAt;
	let refreshed = false;
	if (expiresAt.getTime() - Date.now() < SESSION_LIFETIME_MS - REFRESH_AFTER_MS) {
		expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
		await db.session.update({ where: { id }, data: { expiresAt } });
		refreshed = true;
	}

	return { user: session.user, expiresAt, refreshed };
}

export async function invalidateSession(token: string): Promise<void> {
	await db.session.deleteMany({ where: { id: hashToken(token) } });
}

/** Sign a user out everywhere except (optionally) the session using `keepToken`. */
export async function invalidateUserSessions(userId: number, keepToken?: string): Promise<void> {
	await db.session.deleteMany({
		where: {
			userId,
			...(keepToken ? { id: { not: hashToken(keepToken) } } : {})
		}
	});
}

export function setSessionCookie(
	cookies: Cookies,
	token: string,
	expiresAt: Date,
	secure: boolean
): void {
	cookies.set(SESSION_COOKIE, token, {
		path: cookiePath(),
		httpOnly: true,
		// A Secure cookie is dropped on http://localhost, so only set it on https.
		secure,
		sameSite: 'lax',
		expires: expiresAt
	});
}

export function deleteSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: cookiePath() });
}
