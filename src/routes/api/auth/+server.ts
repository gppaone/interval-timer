import { error, redirect } from '@sveltejs/kit';
import { TIMER_PASSWORD } from '$app/env/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
    const data = await request.formData();
    const password = data.get('password');

    if (password === TIMER_PASSWORD) {
        cookies.set('timer_auth', TIMER_PASSWORD, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365 // 1 year session
        });
        throw redirect(303, '/');
    }

    throw error(401, 'Invalid password');
};