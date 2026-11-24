<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const hints: Record<number, string> = {
		401: 'You need to sign in to view this page.',
		403: "Your account doesn't have access to this page.",
		404: "That page doesn't exist.",
		429: 'Too many attempts. Wait a few minutes and try again.'
	};

	const status = $derived(page.status);
	const hint = $derived(
		hints[status] ??
			(status >= 500
				? 'Something went wrong on the server. Try again in a moment; if it keeps happening, check the server log.'
				: 'Something went wrong with that request.')
	);
</script>

<div class="flex min-h-dvh items-center justify-center bg-slate-950 p-4 text-slate-100">
	<div class="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
		<p class="font-mono text-5xl font-black text-slate-600">{status}</p>
		<h1 class="text-xl font-bold">
			{status === 404 ? 'Page not found' : status === 403 ? 'Access denied' : 'Something went wrong'}
		</h1>
		<p class="text-sm text-slate-400">{hint}</p>
		{#if page.error?.message && page.error.message !== 'Internal Error'}
			<p class="rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-500">{page.error.message}</p>
		{/if}
		<div class="flex gap-3 pt-2">
			<a
				href={resolve('/')}
				class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
			>
				Back to timer
			</a>
			<a
				href={resolve('/login')}
				class="flex-1 rounded-xl bg-slate-800 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
			>
				Sign in
			</a>
		</div>
	</div>
</div>
