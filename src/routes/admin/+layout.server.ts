import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { verifyAdminSession } from '$lib/server/auth';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	if (url.pathname === '/admin/login') return {};

	if (!verifyAdminSession(cookies, env.SESSION_SECRET ?? '')) {
		redirect(302, '/admin/login');
	}

	return {};
};
