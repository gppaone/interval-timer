<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	const input =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none';
</script>

<div class="mx-auto min-h-dvh w-full max-w-md space-y-6 bg-slate-900 p-4 text-slate-100 sm:p-6">
	<header class="flex items-center justify-between border-b border-slate-800 pb-4">
		<h1 class="text-xl font-bold">Change password</h1>
		<a
			href={resolve('/')}
			class="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
		>
			Back to timer
		</a>
	</header>

	{#if form?.success}
		<p class="rounded-lg border border-emerald-900 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
			{form.success}
		</p>
	{/if}
	{#if form?.error}
		<p class="rounded-lg border border-rose-900 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
			{form.error}
		</p>
	{/if}

	<form method="POST" use:enhance={() => async ({ update }) => update({ reset: true })} class="space-y-3">
		<input
			type="password"
			name="current"
			placeholder="Current password"
			required
			autocomplete="current-password"
			class={input}
		/>
		<input
			type="password"
			name="next"
			placeholder="New password (min 8 characters)"
			required
			minlength="8"
			autocomplete="new-password"
			class={input}
		/>
		<input
			type="password"
			name="confirm"
			placeholder="Confirm new password"
			required
			minlength="8"
			autocomplete="new-password"
			class={input}
		/>
		<button
			class="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
		>
			Change password
		</button>
	</form>
</div>
