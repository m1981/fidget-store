import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'crypto';

const MAKER_SESSION_COOKIE = 'maker_session';

export const load: PageServerLoad = async ({ cookies }) => {
	if (cookies.get(MAKER_SESSION_COOKIE) === env.MAKER_PIN) {
		redirect(302, '/makers');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const pin = data.get('pin')?.toString() ?? '';
		const makerPin = env.MAKER_PIN ?? '';

		if (!makerPin) return fail(500, { error: 'Brak konfiguracji PIN' });

		const expected = Buffer.from(makerPin);
		const actual = Buffer.from(pin.padEnd(makerPin.length, '\0').slice(0, makerPin.length));
		const valid = pin.length === makerPin.length && timingSafeEqual(expected, actual);

		if (!valid) return fail(401, { error: 'Nieprawidłowy PIN' });

		cookies.set(MAKER_SESSION_COOKIE, makerPin, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 24 * 60 * 60 // 24 hours
		});
		redirect(302, '/makers');
	}
};
