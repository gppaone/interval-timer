<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const input =
		'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none';
</script>

<div class="mx-auto min-h-dvh w-full max-w-2xl space-y-6 bg-slate-900 p-4 text-slate-100 sm:p-6">
	<header class="flex items-center justify-between border-b border-slate-800 pb-4">
		<h1 class="text-xl font-bold">Users</h1>
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
	{#if form?.error && form.action !== 'create' && form.action !== 'reset'}
		<p class="rounded-lg border border-rose-900 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
			{form.error}
		</p>
	{/if}

	<section class="space-y-3 rounded-2xl border border-slate-800 p-4">
		<h2 class="font-semibold">Add a user</h2>
		{#if form?.error && form.action === 'create'}
			<p class="rounded-lg border border-rose-900 bg-rose-950/50 px-3 py-2 text-sm text-rose-300">
				{form.error}
			</p>
		{/if}
		<form method="POST" action="?/create" use:enhance class="space-y-3">
			<input
				type="email"
				name="email"
				placeholder="Email"
				value={form?.action === 'create' && form.error ? (form.email ?? '') : ''}
				required
				autocomplete="off"
				class={input}
			/>
			<input
				type="password"
				name="password"
				placeholder="Password (min 8 characters)"
				required
				minlength="8"
				autocomplete="new-password"
				class={input}
			/>
			<label class="flex items-center gap-2 text-sm text-slate-300">
				<input type="checkbox" name="isAdmin" /> Administrator
			</label>
			{#if data.unownedRoutine}
				<label class="flex items-center gap-2 text-sm text-amber-300">
					<input type="checkbox" name="claimExisting" />
					Give this user the existing routine “{data.unownedRoutine.name}”
				</label>
			{/if}
			<button
				class="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
			>
				Create user
			</button>
		</form>
	</section>

	<section class="space-y-3">
		{#each data.users as user (user.id)}
			<div class="space-y-3 rounded-2xl border border-slate-800 p-4">
				<div class="flex items-center justify-between gap-2">
					<span class="min-w-0 truncate font-medium">{user.email}</span>
					{#if user.isAdmin}
						<span class="rounded-full bg-emerald-900 px-2 py-0.5 text-xs text-emerald-300">admin</span>
					{/if}
				</div>

				{#if form?.error && form.action === 'reset' && form.id === user.id}
					<p class="text-sm text-rose-300">{form.error}</p>
				{/if}

				<form method="POST" action="?/resetPassword" use:enhance class="flex gap-2">
					<input type="hidden" name="id" value={user.id} />
					<input
						type="password"
						name="password"
						placeholder="New password"
						required
						minlength="8"
						autocomplete="new-password"
						class={input}
					/>
					<button class="shrink-0 rounded-lg bg-slate-800 px-3 text-sm font-semibold hover:bg-slate-700">
						Reset
					</button>
				</form>

				<form
					method="POST"
					action="?/delete"
					use:enhance={({ cancel }) => {
						if (!confirm(`Delete ${user.email} and their routine? This cannot be undone.`)) cancel();
					}}
				>
					<input type="hidden" name="id" value={user.id} />
					<button class="text-sm text-rose-400 hover:text-rose-300">Delete user</button>
				</form>
			</div>
		{/each}
	</section>
</div>
