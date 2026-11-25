// Pure timer logic (no Svelte, no audio, no clock) so it can be tested on its own.

export type Interval = { id: string; name: string; duration: number; type: 'work' | 'rest' };

/** Seconds of "get ready" countdown before every exercise (work interval). */
export const GET_READY_SECONDS = 3;

export type TimerState = {
	index: number;
	/** Seconds left in the current interval. */
	timeLeft: number;
	/** Seconds left in the get-ready countdown; 0 when not counting down. */
	getReady: number;
};

export type Beep = 'countdown' | 'go' | 'warning' | 'transition' | null;

export type Step = { state: TimerState; beep: Beep; finished: boolean };

/** The state at the very beginning of a workout, before Start is pressed. */
export function initialState(intervals: Interval[]): TimerState {
	return { index: 0, timeLeft: intervals[0]?.duration ?? 0, getReady: 0 };
}

/**
 * Enter interval `index`. Exercises start with a get-ready countdown (and its
 * first beep); rests start straight away.
 */
export function beginInterval(intervals: Interval[], index: number): Step {
	const interval = intervals[index];
	if (!interval) return { state: initialState(intervals), beep: null, finished: true };

	const countdown = interval.type === 'work' ? GET_READY_SECONDS : 0;
	return {
		state: { index, timeLeft: interval.duration, getReady: countdown },
		beep: countdown > 0 ? 'countdown' : 'transition',
		finished: false
	};
}

/** Advance the timer by one second. */
export function tick(intervals: Interval[], state: TimerState): Step {
	// Get-ready countdown: 3 -> 2 -> 1 -> go. Each second beeps.
	if (state.getReady > 0) {
		if (state.getReady > 1) {
			return {
				state: { ...state, getReady: state.getReady - 1 },
				beep: 'countdown',
				finished: false
			};
		}
		return { state: { ...state, getReady: 0 }, beep: 'go', finished: false };
	}

	const next = intervals[state.index + 1];

	if (state.timeLeft <= 1) {
		if (next) return beginInterval(intervals, state.index + 1);
		return { state: initialState(intervals), beep: 'transition', finished: true };
	}

	const timeLeft = state.timeLeft - 1;
	// The end-of-interval warning beeps would clash with the countdown that
	// follows, so they are skipped when the next interval is an exercise.
	const warn = timeLeft <= 3 && next?.type !== 'work';
	return { state: { ...state, timeLeft }, beep: warn ? 'warning' : null, finished: false };
}
