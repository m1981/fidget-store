import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createDrop } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const opensAt = data.get('opens_at')?.toString() ?? '';
		const closesAt = data.get('closes_at')?.toString() ?? '';
		const capacityStr = data.get('total_capacity_minutes')?.toString() ?? '';

		if (!opensAt || !closesAt || !capacityStr) {
			return fail(400, { error: 'Wypełnij wszystkie pola' });
		}

		const opensAtDate = new Date(opensAt);
		const closesAtDate = new Date(closesAt);
		const capacity = parseInt(capacityStr, 10);

		if (isNaN(opensAtDate.getTime()) || isNaN(closesAtDate.getTime())) {
			return fail(400, { error: 'Nieprawidłowa data' });
		}
		if (closesAtDate <= opensAtDate) {
			return fail(400, { error: 'Data zamknięcia musi być późniejsza niż otwarcia' });
		}
		if (isNaN(capacity) || capacity <= 0) {
			return fail(400, { error: 'Pojemność musi być liczbą większą od zera' });
		}

		const dropId = await createDrop({ opensAt: opensAtDate, closesAt: closesAtDate, totalCapacityMinutes: capacity });
		redirect(302, `/admin/drops/${dropId}`);
	}
};
