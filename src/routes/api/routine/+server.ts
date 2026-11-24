import { db } from '$lib/db';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type Interval = { id: string; name: string; duration: number; type: 'work' | 'rest' };

function parseRoutine(body: unknown): { name: string; intervals: Interval[] } | null {
	if (!body || typeof body !== 'object') return null;
	const { name, intervals } = body as Record<string, unknown>;

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

	return { name, intervals: clean };
}

export const POST: RequestHandler = async ({ request, locals }) => {
	// The hook already rejects signed-out requests to /api; this narrows the type.
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	const parsed = parseRoutine(await request.json().catch(() => null));
	if (!parsed) throw error(400, 'Invalid routine');

	const intervals = JSON.stringify(parsed.intervals);
	await db.routine.upsert({
		where: { userId: user.id },
		update: { name: parsed.name, intervals },
		create: { userId: user.id, name: parsed.name, intervals }
	});

	return json({ success: true });
};
