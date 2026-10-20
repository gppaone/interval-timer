<script lang="ts">
    import { onDestroy } from 'svelte';
    import { resolve } from '$app/paths';
    import { playBeep } from '$lib/audio';

    export let data;

    let intervals = [...data.routine.intervals];
    let routineName = data.routine.name;

    let currentIndex = 0;
    let timeLeft = intervals[0]?.duration || 0;
    let isRunning = false;
    let timerId: ReturnType<typeof setInterval> | null = null;
    let isEditing = false;

    $: currentInterval = intervals[currentIndex] || { name: 'Done', duration: 0, type: 'rest' };

    function tick() {
        if (timeLeft <= 1) {
            // Transition to next interval
            playBeep(1046.5, 0.4, 'triangle'); // High C double beep on transition
            if (currentIndex < intervals.length - 1) {
                currentIndex += 1;
                timeLeft = intervals[currentIndex].duration;
            } else {
                pauseTimer();
                currentIndex = 0;
                timeLeft = intervals[0]?.duration || 0;
            }
        } else {
            timeLeft -= 1;
            // Trigger sound when 3, 2, or 1 second remain
            if (timeLeft <= 3 && timeLeft > 0) {
                playBeep(659.25, 0.15, 'sine'); // E5 warning beep
            }
        }
    }

    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        timerId = setInterval(tick, 1000);
    }

    function pauseTimer() {
        isRunning = false;
        if (timerId) clearInterval(timerId);
    }

    function resetTimer() {
        pauseTimer();
        currentIndex = 0;
        timeLeft = intervals[0]?.duration || 0;
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

    async function saveRoutine() {
        await fetch(resolve('/api/routine'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: routineName, intervals })
        });
        isEditing = false;
        resetTimer();
    }

    onDestroy(() => {
        if (timerId) clearInterval(timerId);
    });
</script>

<div class="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-6 max-w-md mx-auto">
    <!-- Header -->
    <header class="flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 class="text-xl font-bold tracking-wide">{routineName}</h1>
        <button on:click={() => { isEditing = true; pauseTimer(); }} class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition">
            Edit
        </button>
    </header>

    <!-- Main Timer Display -->
    <main class="flex flex-col items-center justify-center my-auto py-10">
        <div class="inline-block px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase mb-6"
            class:bg-emerald-500={currentInterval.type === 'work'} class:text-emerald-950={currentInterval.type === 'work'}
            class:bg-amber-500={currentInterval.type === 'rest'} class:text-amber-950={currentInterval.type === 'rest'}>
            {currentInterval.type}
        </div>

        <h2 class="text-3xl font-extrabold mb-8 text-center">{currentInterval.name}</h2>
    
        <div class="text-9xl font-black font-mono tracking-tighter my-4">
            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>

        <div class="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-2">
            Interval {currentIndex + 1} of {intervals.length}
        </div>
    </main>

    <!-- Control Buttons -->
    <footer class="flex gap-4">
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
    </footer>

    <!-- Edit Routine Modal -->
    {#if isEditing}
        <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
                <h2 class="text-lg font-bold mb-4">Edit Routine</h2>
        
                <div class="overflow-y-auto flex-1 space-y-3 pr-1">
                    {#each intervals as item, i}
                    <div class="flex items-center gap-2 bg-slate-800/60 p-2.5 rounded-xl border border-slate-800">
                        <input type="text" bind:value={item.name} class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm flex-1" />
                        <input type="number" bind:value={item.duration} min="1" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm w-16 text-center" />
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
                    <button on:click={saveRoutine} class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-semibold text-sm">Save</button>
                </div>
            </div>
        </div>
    {/if}
</div>