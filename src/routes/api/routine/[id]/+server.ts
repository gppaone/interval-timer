import { db } from '$lib/db';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const id = Number(params.id);
	if (!Number.isInteger(id)) throw error(400, 'Invalid workout');

	// Everyone keeps at least one workout.
	const count = await db.routine.count({ where: { userId: user.id } });
	if (count <= 1) throw error(400, "You can't delete your only workout.");

	// Matching on userId as well means a user can only delete their own workouts.
	const { count: deleted } = await db.routine.deleteMany({ where: { id, userId: user.id } });
	if (deleted === 0) throw error(404, 'Workout not found');

	// Forget it as the "last used" workout; the next page load picks another.
	await db.user.updateMany({ where: { id: user.id, lastRoutineId: id }, data: { lastRoutineId: null } });

	return json({ success: true });
};
