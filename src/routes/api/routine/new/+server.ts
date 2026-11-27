import { db } from '$lib/db';
import { MAX_WORKOUTS, defaultIntervals } from '$lib/workouts';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Create another workout for the signed-in user and make it their current one.
export const POST: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const count = await db.routine.count({ where: { userId: user.id } });
	if (count >= MAX_WORKOUTS) throw error(400, `You can have up to ${MAX_WORKOUTS} workouts.`);

	const created = await db.routine.create({
		data: {
			userId: user.id,
			name: `Workout ${count + 1}`,
			intervals: JSON.stringify(defaultIntervals)
		}
	});
	await db.user.update({ where: { id: user.id }, data: { lastRoutineId: created.id } });

	return json({ id: created.id });
};
