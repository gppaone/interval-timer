<script lang="ts">
    import { onDestroy } from 'svelte';
    import { resolve } from '$app/paths';
    import { playBeep } from '$lib/audio';
    import { beginInterval, initialState, tick as nextTick, type Beep, type Step } from '$lib/timer';

    export let data;

    let intervals = [...data.routine.intervals];
    let routineName = data.routine.name;
    // Edited in the dialog and copied onto the header only when Save succeeds.
    let draftName = routineName;

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

    $: currentInterval = intervals[currentIndex] || { name: 'Done', duration: 0, type: 'rest' };
    $: nextInterval = intervals[currentIndex + 1] ?? null;

    function sound(beep: Beep) {
        if (beep === 'countdown') playBeep(880, 0.15, 'sine'); // A5, once per get-ready second
        else if (beep === 'go') playBeep(1318.5, 0.4, 'triangle'); // E6, exercise begins
        else if (beep === 'warning') playBeep(659.25, 0.15, 'sine'); // E5, last 3 seconds
        else if (beep === 'transition') playBeep(1046.5, 0.4, 'triangle'); // High C, interval changes
    }

    function apply(step: Step) {
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
        apply(nextTick(intervals, { index: currentIndex, timeLeft, getReady }));
    }

    function startTimer() {
        if (isRunning || intervals.length === 0) return;
        isRunning = true;
        if (!hasStarted) {
            // Fresh start: begin the first interval (with its countdown if it is an exercise).
            hasStarted = true;
            apply(beginInterval(intervals, 0));
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
        const state = initialState(intervals);
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

    function openEditor() {
        draftName = routineName;
        isEditing = true;
        pauseTimer();
    }

    async function saveRoutine() {
        const name = draftName.trim();
        if (!name) return;
        const response = await fetch(resolve('/api/routine'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, intervals })
        });
        if (!response.ok) return;
        routineName = name;
        draftName = name;
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
        <h1 class="min-w-0 flex-1 truncate text-xl font-bold tracking-wide">{routineName}</h1>
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

    <!-- Main Timer Display -->
    <main class="my-auto flex w-full min-w-0 flex-col items-center justify-center py-6 sm:py-10">

        <h2 class="mb-4 px-4 py-1.5 rounded-full max-w-full text-center text-3xl font-extrabold wrap-break-word sm:mb-8" class:bg-emerald-500={currentInterval.type === 'work'} class:text-emerald-950={currentInterval.type === 'work'}
            class:bg-amber-500={currentInterval.type === 'rest'} class:text-amber-950={currentInterval.type === 'rest'}>{currentInterval.name}</h2>

        <div class="my-2 w-full max-w-full text-center font-timer tabular-nums text-[length:clamp(4rem,calc((100vw-3.5rem)/2.2),11rem)] font-extrabold leading-none tracking-tight whitespace-nowrap sm:my-4"
    class:text-sky-400={getReady > 0}>
            {#if getReady > 0}
                {getReady}
            {:else}
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            {/if}
        </div>

        <div class="text-xs font-semibold uppercase tracking-widest mt-2" class:text-slate-500={getReady === 0} class:text-sky-400={getReady > 0}>
            {#if getReady > 0}
                Get ready
            {:else}
                Interval {currentIndex + 1} of {intervals.length}
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
            {#if nextInterval}
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" class:bg-emerald-500={nextInterval.type === 'work'} class:bg-amber-500={nextInterval.type === 'rest'}></span>
                <span class="min-w-0 flex-1 truncate font-semibold">{nextInterval.name}</span>
                <span class="shrink-0 font-timer tabular-nums text-sm text-slate-400">
                    {String(Math.floor(nextInterval.duration / 60)).padStart(2, '0')}:{String(nextInterval.duration % 60).padStart(2, '0')}
                </span>
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
        
                <div class="overflow-y-auto flex-1 space-y-3 pr-1">
                    {#each intervals as item, i}
                    <div class="flex min-w-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-800/60 p-2.5">
                        <input type="text" bind:value={item.name} class="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm" />
                        <input type="number" bind:value={item.duration} min="1" class="w-16 shrink-0 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-center text-sm" />
                        <span class="text-xs text-slate-400">s</span>
                        <button on:click={() => removeInterval(i)} class="text-rose-400 hover:text-rose-300 p-1 font-bold">✕</button>
                    </div>
                    {/each}
                </div>
        
                <div class="flex gap-2 my-4">
                    <button on:click={() => addInterval('work')} class="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 rounded-lg border border-slate-700">+ Exercise</button>
                    <button on:click={() => addInterval('rest')} class="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 rounded-lg border border-slate-700">+ Rest</button>
                </div>
        
                <div class="flex gap-3 pt-2 border-t border-slate-800">
                    <button on:click={() => isEditing = false} class="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-semibold text-sm">Cancel</button>
                    <button on:click={saveRoutine} disabled={!draftName.trim()} class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">Save</button>
                </div>
            </div>
        </div>
    {/if}
</div>