import { db } from '$lib/db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const defaultIntervals = [
	{ id: '1', name: 'Jumping Jacks', duration: 30, type: 'work' },
	{ id: '2', name: 'Rest', duration: 10, type: 'rest' },
	{ id: '3', name: 'Push-ups', duration: 30, type: 'work' },
	{ id: '4', name: 'Rest', duration: 10, type: 'rest' },
	{ id: '5', name: 'Plank', duration: 30, type: 'work' }
];

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	let routine = await db.routine.findUnique({ where: { userId: user.id } });

	if (!routine) {
		try {
			routine = await db.routine.create({
				data: {
					userId: user.id,
					name: 'Custom Workout',
					intervals: JSON.stringify(defaultIntervals)
				}
			});
		} catch {
			// Two requests raced to create it; the other one won.
			routine = await db.routine.findUniqueOrThrow({ where: { userId: user.id } });
		}
	}

	return {
		user: { email: user.email, isAdmin: user.isAdmin },
		routine: {
			name: routine.name,
			intervals: JSON.parse(routine.intervals)
		}
	};
};
