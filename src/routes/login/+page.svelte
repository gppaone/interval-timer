<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<div class="flex min-h-dvh items-center justify-center bg-slate-950 p-4 text-slate-100">
	<form
		method="POST"
		use:enhance
		class="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-8"
	>
		<h1 class="text-center text-xl font-bold">Interval Timer</h1>

		{#if form?.error}
			<p class="rounded-lg border border-rose-900 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
				{form.error}
			</p>
		{/if}

		<div>
			<label for="email" class="mb-2 block text-xs font-semibold text-slate-400 uppercase">
				Email
			</label>
			<input
				type="email"
				id="email"
				name="email"
				value={form?.email ?? ''}
				required
				autocomplete="username"
				class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
			/>
		</div>
		<div>
			<label for="password" class="mb-2 block text-xs font-semibold text-slate-400 uppercase">
				Password
			</label>
			<input
				type="password"
				id="password"
				name="password"
				required
				autocomplete="current-password"
				class="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
			/>
		</div>
		<button
			type="submit"
			class="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
		>
			Sign in
		</button>
	</form>
</div>
