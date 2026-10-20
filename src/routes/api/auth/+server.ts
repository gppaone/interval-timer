import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { TIMER_PASSWORD } from '$app/env/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  const data = await request.formData();
  const password = data.get('password');

  if (password === TIMER_PASSWORD) {
    cookies.set('timer_auth', TIMER_PASSWORD, {
      path: '/',
      httpOnly: true,
      // Local Vite is http://localhost. A Secure cookie is dropped there, so the
      // next request looks logged-out. Keep Secure on real https deployments.
      secure: url.protocol === 'https:',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 365 // 1 year session
    });

    throw redirect(303, resolve('/'));
  }

  throw error(401, 'Invalid password');
};