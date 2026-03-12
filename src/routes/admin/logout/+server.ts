import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { destroyAdminSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	destroyAdminSession(cookies);
	redirect(302, '/admin/login');
};
