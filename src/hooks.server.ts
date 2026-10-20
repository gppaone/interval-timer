import { redirect, type Handle } from '@sveltejs/kit';
import { TIMER_PASSWORD } from '$app/env/private';

export const handle: Handle = async ({ event, resolve }) => {
    const cookie = event.cookies.get('timer_auth');
    const isLoginPage = event.url.pathname === '/login';
    const isAuthApi = event.url.pathname === '/api/auth';

    // Allow public access to login page and authentication endpoint
    if (isLoginPage || isAuthApi) {
        return resolve(event);
    }

    // Redirect to /login if cookie doesn't match password hash/token
    if (cookie !== TIMER_PASSWORD) {
        throw redirect(303, '/login');
    }

    return resolve(event);
};