import { db } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { name, intervals } = await request.json();

  const updated = await db.routine.upsert({
    where: { id: 1 },
    update: { name, intervals: JSON.stringify(intervals) },
    create: { id: 1, name, intervals: JSON.stringify(intervals) }
  });

  return json({ success: true, routine: updated });
};