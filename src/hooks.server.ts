import { error, json, redirect, type Handle } from '@sveltejs/kit';
import { resolve as resolvePath } from '$app/paths';
import {
	SESSION_COOKIE,
	deleteSessionCookie,
	setSessionCookie,
	validateSession
} from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const session = await validateSession(token);
		if (session) {
			event.locals.user = session.user;
			if (session.refreshed) {
				setSessionCookie(event.cookies, token, session.expiresAt, event.url.protocol === 'https:');
			}
		} else {
			deleteSessionCookie(event.cookies);
		}
	}

	const routeId = event.route.id;
	const isLoginPage = routeId === '/login';
	const user = event.locals.user;

	if (!user) {
		if (isLoginPage) return resolve(event);
		if (routeId?.startsWith('/api/')) return json({ error: 'Unauthorized' }, { status: 401 });
		throw redirect(303, resolvePath('/login'));
	}

	if (isLoginPage) throw redirect(303, resolvePath('/'));
	if (routeId?.startsWith('/admin') && !user.isAdmin) throw error(403, 'Forbidden');

	return resolve(event);
};
