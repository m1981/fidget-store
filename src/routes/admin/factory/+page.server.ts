import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getGlobalSettings, updateGlobalSettings } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	const settings = await getGlobalSettings();
	return { settings };
};

export const actions: Actions = {
	toggle: async ({ request }) => {
		const data = await request.formData();
		const currentValue = data.get('current') === 'true';
		const message = data.get('message')?.toString() ?? '';

		await updateGlobalSettings({
			printer_is_on: !currentValue,
			status_message: message
		});

		return { success: true };
	},

	updateMessage: async ({ request }) => {
		const data = await request.formData();
		const message = data.get('message')?.toString() ?? '';

		if (message.length > 200) {
			return fail(400, { error: 'Wiadomość nie może być dłuższa niż 200 znaków' });
		}

		await updateGlobalSettings({ status_message: message });
		return { success: true };
	}
};
