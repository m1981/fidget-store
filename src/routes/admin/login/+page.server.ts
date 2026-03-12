import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyAdminSession, createAdminSession } from '$lib/server/auth';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ cookies }) => {
	if (verifyAdminSession(cookies, env.SESSION_SECRET ?? '')) {
		redirect(302, '/admin');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const password = data.get('password')?.toString() ?? '';

		const adminPassword = env.ADMIN_PASSWORD ?? '';
		if (!adminPassword) {
			return fail(500, { error: 'Brak konfiguracji hasła administratora' });
		}

		// Compare password directly (plain-text env var comparison, timing-safe)
		const { timingSafeEqual } = await import('crypto');
		const expected = Buffer.from(adminPassword);
		const actual = Buffer.from(password.padEnd(adminPassword.length, '\0').slice(0, adminPassword.length));
		const matches = expected.length === actual.length && timingSafeEqual(expected, actual)
			&& password.length === adminPassword.length;

		if (!matches) {
			return fail(401, { error: 'Nieprawidłowe hasło' });
		}

		createAdminSession(cookies, env.SESSION_SECRET ?? '');
		redirect(302, '/admin');
	}
};
