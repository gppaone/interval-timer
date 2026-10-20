import { redirect, type Handle } from '@sveltejs/kit';
import { resolve as resolvePath } from '$app/paths';
import { TIMER_PASSWORD } from '$app/env/private';

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.cookies.get('timer_auth');

  const isLoginPage = event.url.pathname.endsWith('/login');
  const isAuthApi = event.url.pathname.endsWith('/api/auth');

  if (isLoginPage || isAuthApi) {
    return resolve(event);
  }

  if (cookie !== TIMER_PASSWORD) {
    throw redirect(303, resolvePath('/login'));
  }

  return resolve(event);
};