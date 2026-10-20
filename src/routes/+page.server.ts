import { db } from '$lib/db';
import type { PageServerLoad } from './$types';

const defaultIntervals = [
    { id: '1', name: 'Jumping Jacks', duration: 30, type: 'work' },
    { id: '2', name: 'Rest', duration: 10, type: 'rest' },
    { id: '3', name: 'Push-ups', duration: 30, type: 'work' },
    { id: '4', name: 'Rest', duration: 10, type: 'rest' },
    { id: '5', name: 'Plank', duration: 30, type: 'work' }
];

export const load: PageServerLoad = async () => {
    let routine = await db.routine.findUnique({ where: { id: 1 } });
    
    if (!routine) {
        routine = await db.routine.create({
        data: {
            id: 1,
            name: 'Custom Workout',
            intervals: JSON.stringify(defaultIntervals)
        }
        });
    }

    return {
        routine: {
        name: routine.name,
        intervals: JSON.parse(routine.intervals)
        }
    };
};