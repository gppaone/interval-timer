import { fail, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { db } from '$lib/db';
import { createSession, setSessionCookie } from '$lib/server/auth';
import { normalizeEmail, verifyPassword } from '$lib/server/credentials';
import { clearFailures, isLimited, recordFailure } from '$lib/server/ratelimit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const email = normalizeEmail(data.get('email'));
		const password = data.get('password');

		if (!email || typeof password !== 'string' || !password) {
			return fail(400, { email, error: 'Enter your email and password.' });
		}

		if (isLimited(email)) {
			return fail(429, { email, error: 'Too many failed attempts. Try again in a few minutes.' });
		}

		try {
			const user = await db.user.findUnique({ where: { email } });
			// Verified even when the user does not exist, to keep timing uniform.
			const valid = await verifyPassword(password, user?.passwordHash ?? null);

			if (!user || !valid) {
				recordFailure(email);
				return fail(400, { email, error: 'Invalid email or password.' });
			}

			clearFailures(email);
			const { token, expiresAt } = await createSession(user.id);
			setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
		} catch (err) {
			// SvelteKit hides unexpected errors from the browser, so log the real
			// cause here and show a useful message on the form instead of a 500 page.
			console.error('Login failed unexpectedly:', err);
			return fail(500, {
				email,
				error: 'Sign-in hit a server problem. Check the server log for details.'
			});
		}

		throw redirect(303, resolve('/'));
	}
} satisfies Actions;
