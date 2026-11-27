// Shared by the page (to hide "New workout" at the limit) and the server (to enforce it).
export const MAX_WORKOUTS = 50;

export const defaultIntervals = [
	{ id: '1', name: 'Jumping Jacks', duration: 30, type: 'work' },
	{ id: '2', name: 'Rest', duration: 10, type: 'rest' },
	{ id: '3', name: 'Push-ups', duration: 30, type: 'work' },
	{ id: '4', name: 'Rest', duration: 10, type: 'rest' },
	{ id: '5', name: 'Plank', duration: 30, type: 'work' }
];
