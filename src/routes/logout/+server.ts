import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { SESSION_COOKIE, deleteSessionCookie, invalidateSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await invalidateSession(token);
	deleteSessionCookie(cookies);

	throw redirect(303, resolve('/login'));
};
