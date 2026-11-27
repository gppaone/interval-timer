<script lang="ts">
    import { onDestroy } from 'svelte';
    import { resolve } from '$app/paths';
    import { playBeep } from '$lib/audio';
    import { MAX_WORKOUTS } from '$lib/workouts';
    import {
        DEFAULT_ROUND_REST,
        MAX_ROUNDS,
        MAX_ROUND_REST,
        beginInterval,
        formatTime,
        initialState,
        summarize,
        tick as nextTick,
        upNext,
        type Beep,
        type Plan,
        type Step,
        type TimerState
    } from '$lib/timer';

    export let data;

    // Which workout this page is showing. Switching workouts reloads the page, so
    // this never changes while the page is open.
    const routineId: number = data.routine.id;
    let workouts: { id: number; name: string }[] = data.workouts;
    let pickerError = '';

    let intervals = [...data.routine.intervals];
    let routineName = data.routine.name;
    // Edited in the dialog and copied onto the header only when Save succeeds.
    let draftName = routineName;

    // Rounds: the whole interval list repeats `rounds` times, with `roundRest`
    // seconds between rounds. Drafts are edited in the dialog the same way.
    let rounds: number = data.routine.rounds ?? 1;
    let roundRest: number = data.routine.roundRest ?? DEFAULT_ROUND_REST;
    let draftRounds: number | null = rounds;
    let draftRoundRest: number | null = roundRest;
    let editSnapshot = '';
    let saveError = '';

    let currentRound = 0;
    let inRoundRest = false;
    let currentIndex = 0;
    let timeLeft = intervals[0]?.duration || 0;
    // Seconds left in the "get ready" countdown before an exercise (0 = none).
    let getReady = 0;
    // False until Start is pressed, and again after Reset or finishing, so the
    // first exercise gets its countdown too.
    let hasStarted = false;
    let isRunning = false;
    let timerId: ReturnType<typeof setInterval> | null = null;
    let isEditing = false;

    $: plan = { intervals, rounds, roundRest } as Plan;
    $: currentInterval = intervals[currentIndex] || { name: 'Done', duration: 0, type: 'rest' };
    // What the big label shows: the exercise/rest, or "Round rest" between rounds.
    $: pill = inRoundRest
        ? { name: 'Round rest', kind: 'round' }
        : { name: currentInterval.name, kind: currentInterval.type };
    $: next = upNext(plan, { round: currentRound, index: currentIndex, timeLeft, getReady, inRoundRest } as TimerState);

    const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    // Editing: values are validated live, and Save is blocked until they are valid.
    $: roundsOk = Number.isInteger(draftRounds) && (draftRounds ?? 0) >= 1 && (draftRounds ?? 0) <= MAX_ROUNDS;
    $: restOk = Number.isInteger(draftRoundRest) && (draftRoundRest ?? -1) >= 0 && (draftRoundRest ?? -1) <= MAX_ROUND_REST;
    // The rest between rounds only matters (and is only shown) when rounds is not 1.
    $: showRest = draftRounds !== 1;
    $: canSave = !!draftName.trim() && roundsOk && (!showRest || restOk);
    $: summary = summarize({
        intervals,
        rounds: roundsOk ? (draftRounds as number) : 1,
        roundRest: restOk ? (draftRoundRest as number) : 0
    });

    // Rounds are whole numbers, so block the keys that make a number input negative or fractional.
    function wholeNumbersOnly(event: KeyboardEvent) {
        if (['-', '+', '.', ',', 'e', 'E'].includes(event.key)) event.preventDefault();
    }

    function normalizeRounds() {
        const n = Math.floor(Number(draftRounds));
        draftRounds = Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_ROUNDS) : 1;
    }

    function normalizeRest() {
        const n = Math.floor(Number(draftRoundRest));
        draftRoundRest =
            draftRoundRest !== null && Number.isFinite(n) && n >= 0 ? Math.min(n, MAX_ROUND_REST) : DEFAULT_ROUND_REST;
    }

    function sound(beep: Beep) {
        if (beep === 'countdown') playBeep(880, 0.15, 'sine'); // A5, once per get-ready second
        else if (beep === 'go') playBeep(1318.5, 0.4, 'triangle'); // E6, exercise begins
        else if (beep === 'warning') playBeep(659.25, 0.15, 'sine'); // E5, last 3 seconds
        else if (beep === 'transition') playBeep(1046.5, 0.4, 'triangle'); // High C, interval changes
    }

    function apply(step: Step) {
        currentRound = step.state.round;
        inRoundRest = step.state.inRoundRest;
        currentIndex = step.state.index;
        timeLeft = step.state.timeLeft;
        getReady = step.state.getReady;
        sound(step.beep);
        if (step.finished) {
            pauseTimer();
            hasStarted = false;
        }
    }

    function tick() {
        apply(nextTick(plan, { round: currentRound, index: currentIndex, timeLeft, getReady, inRoundRest }));
    }

    function startTimer() {
        if (isRunning || intervals.length === 0) return;
        isRunning = true;
        if (!hasStarted) {
            // Fresh start: begin the first interval (with its countdown if it is an exercise).
            hasStarted = true;
            apply(beginInterval(plan, 0, 0));
        }
        timerId = setInterval(tick, 1000);
    }

    function pauseTimer() {
        isRunning = false;
        if (timerId) clearInterval(timerId);
    }

    function resetTimer() {
        pauseTimer();
        hasStarted = false;
        const state = initialState(plan);
        currentRound = state.round;
        inRoundRest = false;
        currentIndex = state.index;
        timeLeft = state.timeLeft;
        getReady = 0;
    }

    function addInterval(type: 'work' | 'rest') {
        intervals = [
            ...intervals,
            {
                id: crypto.randomUUID(),
                name: type === 'work' ? 'Exercise' : 'Rest',
                duration: type === 'work' ? 30 : 10,
                type
            }
        ];
    }

    function removeInterval(index: number) {
        intervals = intervals.filter((_, i) => i !== index);
    }

    function openWorkout(id?: number) {
        // A full page load gives every workout a clean timer.
        window.location.assign(id === undefined ? resolve('/') : `${resolve('/')}?w=${id}`);
    }

    async function onPick(event: Event) {
        const select = event.currentTarget as HTMLSelectElement;
        const value = select.value;
        if (value === String(routineId)) return;

        pickerError = '';
        if (hasStarted && !confirm('Switch workouts? Your progress in this workout will be lost.')) {
            select.value = String(routineId);
            return;
        }
        pauseTimer();

        if (value !== 'new') {
            openWorkout(Number(value));
            return;
        }
        try {
            const response = await fetch(resolve('/api/routine/new'), { method: 'POST' });
            if (!response.ok) throw new Error(String(response.status));
            const created = await response.json();
            openWorkout(created.id);
        } catch {
            select.value = String(routineId);
            pickerError = "Couldn't create a new workout. Please try again.";
        }
    }

    async function deleteWorkout() {
        if (!confirm(`Delete "${routineName}"? This can't be undone.`)) return;
        saveError = '';
        try {
            const response = await fetch(`${resolve('/api/routine')}/${routineId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(String(response.status));
        } catch {
            saveError = "Couldn't delete this workout. Please try again.";
            return;
        }
        // Back to the start; the server picks one of the remaining workouts.
        openWorkout();
    }

    function openEditor() {
        draftName = routineName;
        draftRounds = rounds;
        draftRoundRest = roundRest;
        // The interval inputs edit the list directly, so remember it for Cancel.
        editSnapshot = JSON.stringify(intervals);
        saveError = '';
        isEditing = true;
        pauseTimer();
    }

    function cancelEditor() {
        intervals = JSON.parse(editSnapshot);
        isEditing = false;
    }

    async function saveRoutine() {
        const name = draftName.trim();
        if (!canSave) return;
        // With a single round the rest input is hidden, so keep the stored value.
        const newRounds = draftRounds as number;
        const newRoundRest = restOk ? (draftRoundRest as number) : roundRest;

        saveError = '';
        try {
            const response = await fetch(resolve('/api/routine'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: routineId, name, intervals, rounds: newRounds, roundRest: newRoundRest })
            });
            if (!response.ok) throw new Error(String(response.status));
        } catch {
            saveError = "Couldn't save your routine. Check your connection and try again.";
            return;
        }
        routineName = name;
        draftName = name;
        workouts = workouts.map((w) => (w.id === routineId ? { ...w, name } : w));
        rounds = newRounds;
        roundRest = newRoundRest;
        isEditing = false;
        resetTimer();
    }

    onDestroy(() => {
        if (timerId) clearInterval(timerId);
    });
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between bg-slate-900 p-4 text-slate-100 sm:p-6">
    <!-- Header -->
    <header class="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div class="relative min-w-0 flex-1">
            <select
                aria-label="Workout"
                value={routineId}
                on:change={onPick}
                class="w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent py-1 pr-6 text-xl font-bold tracking-wide [color-scheme:dark] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
                {#each workouts as w (w.id)}
                    <option value={w.id} class="bg-slate-900 text-slate-100">{w.id === routineId ? routineName : w.name}</option>
                {/each}
                {#if workouts.length < MAX_WORKOUTS}
                    <option value="new" class="bg-slate-900 text-slate-100">＋ New workout</option>
                {/if}
            </select>
            <span class="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 text-slate-500" aria-hidden="true">▾</span>
        </div>
        <button on:click={openEditor} class="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700">
            Edit
        </button>
        <details class="relative shrink-0">
            <summary class="cursor-pointer list-none rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700" aria-label="Account menu">
                ⋯
            </summary>
            <div class="absolute right-0 z-40 mt-2 w-56 space-y-1 rounded-xl border border-slate-800 bg-slate-900 p-2 text-sm shadow-xl">
                <div class="truncate px-2 py-1 text-xs text-slate-500">{data.user.email}</div>
                {#if data.user.isAdmin}
                    <a href={resolve('/admin')} class="block rounded-lg px-2 py-1.5 hover:bg-slate-800">Manage users</a>
                {/if}
                <a href={resolve('/account')} class="block rounded-lg px-2 py-1.5 hover:bg-slate-800">Change password</a>
                <form method="POST" action={resolve('/logout')}>
                    <button class="w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-800">Sign out</button>
                </form>
            </div>
        </details>
    </header>

    {#if pickerError}
        <p class="mt-3 rounded-lg border border-rose-900 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">{pickerError}</p>
    {/if}

    <!-- Main Timer Display -->
    <main class="my-auto flex w-full min-w-0 flex-col items-center justify-center py-6 sm:py-10">

        <h2 class="mb-4 px-4 py-1.5 rounded-full max-w-full text-center text-3xl font-extrabold wrap-break-word sm:mb-8" class:bg-emerald-500={pill.kind === 'work'} class:text-emerald-950={pill.kind === 'work'}
            class:bg-amber-500={pill.kind === 'rest'} class:text-amber-950={pill.kind === 'rest'}
            class:bg-violet-400={pill.kind === 'round'} class:text-violet-950={pill.kind === 'round'}>{pill.name}</h2>

        <div class="my-2 w-full max-w-full text-center font-timer tabular-nums text-[length:clamp(4rem,calc((100vw-3.5rem)/2.2),11rem)] font-extrabold leading-none tracking-tight whitespace-nowrap sm:my-4"
    class:text-sky-400={getReady > 0}>
            {#if getReady > 0}
                {getReady}
            {:else}
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            {/if}
        </div>

        <div class="mt-2 space-y-1 text-center text-xs font-semibold uppercase tracking-widest">
            {#if rounds > 1}
                <div class={inRoundRest ? 'text-violet-300' : 'text-slate-400'}>
                    {inRoundRest ? `Rest before round ${currentRound + 1} of ${rounds}` : `Round ${currentRound + 1} of ${rounds}`}
                </div>
            {/if}
            {#if getReady > 0}
                <div class="text-sky-400">Get ready</div>
            {:else if !inRoundRest}
                <div class="text-slate-500">Interval {currentIndex + 1} of {intervals.length}</div>
            {/if}
        </div>
    </main>

    <!-- Control Buttons -->
    <footer class="space-y-4">
        <div class="flex gap-4">
            {#if !isRunning}
                <button on:click={startTimer} class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg transition">
                Start
                </button>
            {:else}
                <button on:click={pauseTimer} class="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-2xl shadow-lg transition">
                Pause
                </button>
            {/if}
            <button on:click={resetTimer} class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-4 rounded-2xl transition">
                Reset
            </button>
        </div>

        <!-- Up next -->
        <div class="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-800/50 px-4 py-3" aria-live="polite">
            <span class="shrink-0 text-xs font-semibold uppercase tracking-widest text-slate-500">Up next</span>
            {#if next?.kind === 'interval'}
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" class:bg-emerald-500={next.interval.type === 'work'} class:bg-amber-500={next.interval.type === 'rest'}></span>
                <span class="min-w-0 flex-1 truncate font-semibold">{next.round !== currentRound ? `Round ${next.round + 1} · ` : ''}{next.interval.name}</span>
                <span class="shrink-0 font-timer tabular-nums text-sm text-slate-400">{mmss(next.interval.duration)}</span>
            {:else if next?.kind === 'roundRest'}
                <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400"></span>
                <span class="min-w-0 flex-1 truncate font-semibold">Round rest</span>
                <span class="shrink-0 font-timer tabular-nums text-sm text-slate-400">{mmss(next.duration)}</span>
            {:else}
                <span class="min-w-0 flex-1 truncate font-semibold text-slate-400">Last interval, then done</span>
            {/if}
        </div>
    </footer>

    <!-- Edit Routine Modal -->
    {#if isEditing}
        <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
                <h2 class="text-lg font-bold mb-4">Edit Routine</h2>

                <label class="mb-4 block">
                    <span class="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-slate-500">Name</span>
                    <input
                        type="text"
                        bind:value={draftName}
                        maxlength="100"
                        class="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                    />
                </label>
        
                <div class="flex-1 space-y-4 overflow-y-auto pr-1">
                    <div class="space-y-3">
                        {#each intervals as item, i}
                        <div class="flex min-w-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 p-2.5">
                            <input type="text" bind:value={item.name} class="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm" />
                            <input type="number" bind:value={item.duration} min="1" class="w-16 shrink-0 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-center text-sm" />
                            <span class="text-xs text-slate-400">s</span>
                            <button on:click={() => removeInterval(i)} class="text-rose-400 hover:text-rose-300 p-1 font-bold">✕</button>
                        </div>
                        {/each}
                    </div>

                    <div class="flex gap-2">
                        <button on:click={() => addInterval('work')} class="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 rounded-lg border border-slate-700">+ Exercise</button>
                        <button on:click={() => addInterval('rest')} class="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 rounded-lg border border-slate-700">+ Rest</button>
                    </div>

                    <!-- Rounds -->
                    <div class="space-y-3 rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                        <label class="flex items-center justify-between gap-3">
                            <span>
                                <span class="block text-sm font-semibold">Rounds</span>
                                <span class="block text-xs text-slate-500">Repeat the whole list. 1 = no repeat.</span>
                            </span>
                            <input
                                type="number"
                                inputmode="numeric"
                                min="1"
                                max={MAX_ROUNDS}
                                step="1"
                                bind:value={draftRounds}
                                on:keydown={wholeNumbersOnly}
                                on:blur={normalizeRounds}
                                aria-invalid={!roundsOk}
                                class="w-20 shrink-0 rounded border bg-slate-900 px-2 py-1 text-center text-sm {roundsOk ? 'border-slate-700' : 'border-rose-500'}"
                            />
                        </label>
                        {#if !roundsOk}
                            <p class="text-xs text-rose-400">Rounds must be a whole number from 1 to {MAX_ROUNDS}.</p>
                        {/if}

                        {#if showRest}
                            <label class="flex items-center justify-between gap-3">
                                <span class="text-sm font-semibold">Rest between rounds</span>
                                <span class="flex shrink-0 items-center gap-2">
                                    <input
                                        type="number"
                                        inputmode="numeric"
                                        min="0"
                                        max={MAX_ROUND_REST}
                                        step="1"
                                        bind:value={draftRoundRest}
                                        on:keydown={wholeNumbersOnly}
                                        on:blur={normalizeRest}
                                        aria-invalid={!restOk}
                                        class="w-20 rounded border bg-slate-900 px-2 py-1 text-center text-sm {restOk ? 'border-slate-700' : 'border-rose-500'}"
                                    />
                                    <span class="text-xs text-slate-400">s</span>
                                </span>
                            </label>
                            {#if !restOk}
                                <p class="text-xs text-rose-400">Rest must be a whole number of seconds, 0 to {MAX_ROUND_REST}.</p>
                            {/if}
                        {/if}
                    </div>

                    <!-- Time summary -->
                    <div class="rounded-xl border border-slate-800 bg-slate-800/40 p-3">
                        <div class="flex items-baseline justify-between gap-3">
                            <span class="text-sm font-semibold">Time per round</span>
                            <span class="font-timer text-2xl font-extrabold tabular-nums">{formatTime(summary.round)}</span>
                        </div>
                        <p class="mt-1 text-xs text-slate-400">
                            Exercises {formatTime(summary.exercises)} + rests {formatTime(summary.rests)} + get ready {formatTime(summary.getReady)}
                        </p>
                        {#if roundsOk && (draftRounds ?? 1) > 1}
                            <div class="mt-3 flex items-baseline justify-between gap-3 border-t border-slate-700 pt-3">
                                <span class="text-sm font-semibold">Whole workout</span>
                                <span class="font-timer text-2xl font-extrabold tabular-nums">{formatTime(summary.workout)}</span>
                            </div>
                            <p class="mt-1 text-xs text-slate-400">
                                {draftRounds} rounds + {(draftRounds ?? 1) - 1} × {formatTime(restOk ? (draftRoundRest ?? 0) : 0)} rest between rounds
                            </p>
                        {/if}
                    </div>

                    {#if workouts.length > 1}
                        <button on:click={deleteWorkout} class="w-full rounded-xl border border-rose-900 py-2 text-sm font-semibold text-rose-400 transition hover:bg-rose-950/50">
                            Delete this workout
                        </button>
                    {/if}
                </div>

                {#if saveError}
                    <p class="mt-3 text-sm text-rose-400">{saveError}</p>
                {/if}

                <div class="mt-4 flex gap-3 border-t border-slate-800 pt-4">
                    <button on:click={cancelEditor} class="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold text-sm">Cancel</button>
                    <button on:click={saveRoutine} disabled={!canSave} class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">Save</button>
                </div>
            </div>
        </div>
    {/if}
</div>