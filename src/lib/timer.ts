// Pure timer logic (no Svelte, no audio, no clock) so it can be tested on its own.

export type Interval = { id: string; name: string; duration: number; type: 'work' | 'rest' };

/** Seconds of "get ready" countdown before every exercise (work interval). */
export const GET_READY_SECONDS = 3;

export const MAX_ROUNDS = 99;
export const MAX_ROUND_REST = 3600;
export const DEFAULT_ROUND_REST = 60;

/** What the timer runs: the interval list, repeated `rounds` times. */
export type Plan = {
	intervals: Interval[];
	rounds: number;
	/** Seconds of rest between rounds (not after the last one). */
	roundRest: number;
};

export type TimerState = {
	/** Zero-based round. During a round rest this is the round about to start. */
	round: number;
	index: number;
	/** Seconds left in the current interval (or in the round rest). */
	timeLeft: number;
	/** Seconds left in the get-ready countdown; 0 when not counting down. */
	getReady: number;
	/** True while resting between rounds. */
	inRoundRest: boolean;
};

export type Beep = 'countdown' | 'go' | 'warning' | 'transition' | null;

export type Step = { state: TimerState; beep: Beep; finished: boolean };

export type UpNext =
	| { kind: 'interval'; interval: Interval; round: number }
	| { kind: 'roundRest'; duration: number; round: number }
	| null;

/** The state at the very beginning of a workout, before Start is pressed. */
export function initialState(plan: Plan): TimerState {
	return {
		round: 0,
		index: 0,
		timeLeft: plan.intervals[0]?.duration ?? 0,
		getReady: 0,
		inRoundRest: false
	};
}

/**
 * Enter interval `index` of `round`. Exercises start with a get-ready
 * countdown (and its first beep); rests start straight away.
 */
export function beginInterval(plan: Plan, index: number, round = 0): Step {
	const interval = plan.intervals[index];
	if (!interval) return { state: initialState(plan), beep: null, finished: true };

	const countdown = interval.type === 'work' ? GET_READY_SECONDS : 0;
	return {
		state: { round, index, timeLeft: interval.duration, getReady: countdown, inRoundRest: false },
		beep: countdown > 0 ? 'countdown' : 'transition',
		finished: false
	};
}

/** What comes after the current interval (or round rest). */
export function upNext(plan: Plan, state: TimerState): UpNext {
	const first = plan.intervals[0];

	if (state.inRoundRest) {
		return first ? { kind: 'interval', interval: first, round: state.round } : null;
	}

	const next = plan.intervals[state.index + 1];
	if (next) return { kind: 'interval', interval: next, round: state.round };

	if (state.round < plan.rounds - 1) {
		if (plan.roundRest > 0) {
			return { kind: 'roundRest', duration: plan.roundRest, round: state.round + 1 };
		}
		return first ? { kind: 'interval', interval: first, round: state.round + 1 } : null;
	}
	return null;
}

/** Advance the timer by one second. */
export function tick(plan: Plan, state: TimerState): Step {
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

	const next = upNext(plan, state);

	if (state.timeLeft <= 1) {
		if (state.inRoundRest) return beginInterval(plan, 0, state.round);

		if (next?.kind === 'roundRest') {
			return {
				state: {
					round: next.round,
					index: state.index,
					timeLeft: next.duration,
					getReady: 0,
					inRoundRest: true
				},
				beep: 'transition',
				finished: false
			};
		}
		if (next) return beginInterval(plan, next.round === state.round ? state.index + 1 : 0, next.round);

		return { state: initialState(plan), beep: 'transition', finished: true };
	}

	const timeLeft = state.timeLeft - 1;
	// The end-of-interval warning beeps would clash with the countdown that
	// follows, so they are skipped when the next interval is an exercise.
	const nextIsExercise = next?.kind === 'interval' && next.interval.type === 'work';
	const warn = timeLeft <= 3 && !nextIsExercise;
	return { state: { ...state, timeLeft }, beep: warn ? 'warning' : null, finished: false };
}

/** Whole, non-negative seconds; anything else (blank, NaN, negative) counts as 0. */
function seconds(value: unknown): number {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) && n > 0 ? n : 0;
}

export type TimeSummary = {
	exercises: number;
	rests: number;
	getReady: number;
	/** Exercises + rests + get-ready countdowns for one round. */
	round: number;
	/** Rest time between rounds, in total. */
	roundRests: number;
	/** Everything: all rounds plus the rests between them. */
	workout: number;
};

/** How long a round (and the whole workout) takes. */
export function summarize(plan: Plan): TimeSummary {
	let exercises = 0;
	let rests = 0;
	let exerciseCount = 0;
	for (const interval of plan.intervals) {
		if (interval.type === 'work') {
			exercises += seconds(interval.duration);
			exerciseCount += 1;
		} else {
			rests += seconds(interval.duration);
		}
	}

	const rounds = Math.max(1, Math.floor(plan.rounds) || 1);
	const getReady = exerciseCount * GET_READY_SECONDS;
	const round = exercises + rests + getReady;
	const roundRests = (rounds - 1) * seconds(plan.roundRest);

	return { exercises, rests, getReady, round, roundRests, workout: round * rounds + roundRests };
}

/** 75 -> "1:15", 3725 -> "1:02:05". */
export function formatTime(totalSeconds: number): string {
	const s = Math.max(0, Math.round(totalSeconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = String(s % 60).padStart(2, '0');
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
