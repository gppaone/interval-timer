import { fail } from '@sveltejs/kit';
import { db } from '$lib/db';
import { invalidateUserSessions } from '$lib/server/auth';
import {
	hashPassword,
	normalizeEmail,
	validateEmail,
	validatePassword
} from '$lib/server/credentials';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [users, unownedRoutine] = await Promise.all([
		db.user.findMany({
			orderBy: { createdAt: 'asc' },
			select: { id: true, email: true, isAdmin: true, createdAt: true }
		}),
		db.routine.findFirst({ where: { userId: null }, select: { id: true, name: true } })
	]);

	return { users, unownedRoutine };
};

export const actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const email = normalizeEmail(data.get('email'));
		const password = data.get('password');
		const isAdmin = data.get('isAdmin') === 'on';
		const claimExisting = data.get('claimExisting') === 'on';

		const problem = validateEmail(email) ?? validatePassword(password);
		if (problem) return fail(400, { action: 'create', email, error: problem });

		if (await db.user.findUnique({ where: { email } })) {
			return fail(400, { action: 'create', email, error: 'That email already has an account.' });
		}

		const passwordHash = await hashPassword(password as string);
		const user = await db.user.create({ data: { email, passwordHash, isAdmin } });

		let claimed = false;
		if (claimExisting) {
			// Hand the routine that predates accounts to this user. Only unowned
			// rows match, so this can never take another user's routine.
			const unowned = await db.routine.findFirst({ where: { userId: null } });
			if (unowned) {
				await db.routine.update({ where: { id: unowned.id }, data: { userId: user.id } });
				claimed = true;
			}
		}

		return {
			action: 'create',
			success: `Created ${email}${claimed ? ' and assigned them the existing routine' : ''}.`
		};
	},

	resetPassword: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const password = data.get('password');

		const problem = validatePassword(password);
		if (problem) return fail(400, { action: 'reset', id, error: problem });

		const target = await db.user.findUnique({ where: { id } });
		if (!target) return fail(404, { action: 'reset', id, error: 'User not found.' });

		await db.user.update({
			where: { id },
			data: { passwordHash: await hashPassword(password as string) }
		});
		// Anyone signed in as that user must sign in again with the new password.
		await invalidateUserSessions(id);

		return { action: 'reset', id, success: `Password reset for ${target.email}.` };
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));

		if (id === locals.user?.id) {
			return fail(400, { action: 'delete', id, error: "You can't delete your own account." });
		}

		const target = await db.user.findUnique({ where: { id } });
		if (!target) return fail(404, { action: 'delete', id, error: 'User not found.' });

		// Sessions and the user's routine are removed by ON DELETE CASCADE.
		await db.user.delete({ where: { id } });

		return { action: 'delete', success: `Deleted ${target.email}.` };
	}
} satisfies Actions;
