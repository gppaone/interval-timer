import { db } from '$lib/db';
import { error, json } from '@sveltejs/kit';
import { MAX_ROUNDS, MAX_ROUND_REST } from '$lib/timer';
import type { RequestHandler } from './$types';

type Interval = { id: string; name: string; duration: number; type: 'work' | 'rest' };

type ParsedRoutine = {
	id: number;
	name: string;
	intervals: Interval[];
	// Left undefined when the client did not send them, so an older cached page
	// saving a routine cannot reset a user's rounds.
	rounds?: number;
	roundRest?: number;
};

function parseRoutine(body: unknown): ParsedRoutine | null {
	if (!body || typeof body !== 'object') return null;
	const { id: routineId, name, intervals, rounds, roundRest } = body as Record<string, unknown>;

	if (!Number.isInteger(routineId)) return null;
	if (typeof name !== 'string' || name.length > 100) return null;
	if (!Array.isArray(intervals) || intervals.length > 200) return null;

	const clean: Interval[] = [];
	for (const item of intervals) {
		if (!item || typeof item !== 'object') return null;
		const { id, name: itemName, duration, type } = item as Record<string, unknown>;
		if (typeof id !== 'string' || id.length > 64) return null;
		if (typeof itemName !== 'string' || itemName.length > 100) return null;
		if (!Number.isInteger(duration) || (duration as number) < 1 || (duration as number) > 86400) {
			return null;
		}
		if (type !== 'work' && type !== 'rest') return null;
		clean.push({ id, name: itemName, duration: duration as number, type });
	}

	// Rounds must be a whole number of at least 1; the rest between rounds may be 0.
	if (rounds !== undefined && (!Number.isInteger(rounds) || (rounds as number) < 1 || (rounds as number) > MAX_ROUNDS)) {
		return null;
	}
	if (
		roundRest !== undefined &&
		(!Number.isInteger(roundRest) || (roundRest as number) < 0 || (roundRest as number) > MAX_ROUND_REST)
	) {
		return null;
	}

	return { id: routineId as number, name, intervals: clean, rounds: rounds as number | undefined, roundRest: roundRest as number | undefined };
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// The hook already rejects signed-out requests to /api; this narrows the type.
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const parsed = parseRoutine(await request.json().catch(() => null));
	if (!parsed) throw error(400, 'Invalid routine');

	const intervals = JSON.stringify(parsed.intervals);
	const { rounds, roundRest } = parsed;
	// Matching on userId as well means a user can only ever change their own workouts.
	const { count } = await db.routine.updateMany({
		where: { id: parsed.id, userId: user.id },
		data: { name: parsed.name, intervals, rounds, roundRest }
	});
	if (count === 0) throw error(404, 'Workout not found');

	return json({ success: true });
};
