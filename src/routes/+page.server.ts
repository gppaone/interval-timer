import { db } from '$lib/db';
import { defaultIntervals } from '$lib/workouts';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	let workouts = await db.routine.findMany({ where: { userId: user.id }, orderBy: { id: 'asc' } });

	// First visit (or a brand new account): give the user a starter workout.
	if (workouts.length === 0) {
		const created = await db.routine.create({
			data: {
				userId: user.id,
				name: 'StartTimer',
				intervals: JSON.stringify(defaultIntervals)
			}
		});
		workouts = [created];
	}

	const { lastRoutineId } = await db.user.findUniqueOrThrow({
		where: { id: user.id },
		select: { lastRoutineId: true }
	});

	// Which workout to show: ?w=<id> if it is one of this user's, else the one they
	// used last, else the first. Anything that is not theirs is silently ignored.
	const requested = Number(url.searchParams.get('w'));
	const current =
		workouts.find((w) => w.id === requested) ??
		workouts.find((w) => w.id === lastRoutineId) ??
		workouts[0];

	if (lastRoutineId !== current.id) {
		await db.user.update({ where: { id: user.id }, data: { lastRoutineId: current.id } });
	}

	return {
		user: { email: user.email, isAdmin: user.isAdmin },
		workouts: workouts.map((w) => ({ id: w.id, name: w.name })),
		routine: {
			id: current.id,
			name: current.name,
			intervals: JSON.parse(current.intervals),
			rounds: current.rounds,
			roundRest: current.roundRest
		}
	};
};
