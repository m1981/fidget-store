import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';

const MAKER_SESSION_COOKIE = 'maker_session';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	if (url.pathname === '/makers/login') return {};

	const token = cookies.get(MAKER_SESSION_COOKIE);
	if (token !== env.MAKER_PIN) {
		redirect(302, '/makers/login');
	}

	return {};
};
