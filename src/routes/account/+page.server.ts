import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/db';
import { SESSION_COOKIE, invalidateUserSessions } from '$lib/server/auth';
import { hashPassword, validatePassword, verifyPassword } from '$lib/server/credentials';
import { clearFailures, isLimited, recordFailure } from '$lib/server/ratelimit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request, locals, cookies }) => {
		const sessionUser = locals.user;
		if (!sessionUser) throw error(401, 'Unauthorized');

		const data = await request.formData();
		const current = data.get('current');
		const next = data.get('next');
		const confirm = data.get('confirm');

		const limitKey = `change:${sessionUser.id}`;
		if (isLimited(limitKey)) {
			return fail(429, { error: 'Too many failed attempts. Try again in a few minutes.' });
		}

		const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
		if (typeof current !== 'string' || !(await verifyPassword(current, user.passwordHash))) {
			recordFailure(limitKey);
			return fail(400, { error: 'Your current password is incorrect.' });
		}
		clearFailures(limitKey);

		const problem = validatePassword(next);
		if (problem) return fail(400, { error: problem });
		if (next !== confirm) return fail(400, { error: 'The new passwords do not match.' });

		await db.user.update({
			where: { id: user.id },
			data: { passwordHash: await hashPassword(next as string) }
		});
		// Sign out every other device, keep this one.
		await invalidateUserSessions(user.id, cookies.get(SESSION_COOKIE));

		return { success: 'Password changed.' };
	}
} satisfies Actions;
