<script lang="ts">
    import { enhance } from '$app/forms';
</script>

<div class="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
    <form method="POST" action="/api/auth" use:enhance class="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm space-y-4">
        <h1 class="text-xl font-bold text-center">Private Access</h1>
        <div>
            <label for="password" class="block text-xs font-semibold text-slate-400 uppercase mb-2">Password</label>
            <input type="password" id="password" name="password" required class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm transition">
        Unlock Timer
        </button>
    </form>
</div>