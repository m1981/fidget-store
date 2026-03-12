import type { Actions, PageServerLoad } from './$types';
import { getPrintBatch, markNextPrinted, undoLastPrinted } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	const batch = await getPrintBatch();
	return { batch };
};

export const actions: Actions = {
	increment: async ({ request }) => {
		const data = await request.formData();
		const variantId = parseInt(data.get('variant_id')?.toString() ?? '', 10);
		if (isNaN(variantId)) return { ok: false, error: 'Nieprawidłowy variant' };

		const result = await markNextPrinted(variantId);
		if (!result.ok) return { ok: false, error: 'Nie ma nic do wydrukowania' };
		return { ok: true, packed: result.orderPacked };
	},

	decrement: async ({ request }) => {
		const data = await request.formData();
		const variantId = parseInt(data.get('variant_id')?.toString() ?? '', 10);
		if (isNaN(variantId)) return { ok: false, error: 'Nieprawidłowy variant' };

		const result = await undoLastPrinted(variantId);
		if (!result.ok) {
			const msg = result.reason === 'UNDO_WINDOW_EXPIRED'
				? 'Minął czas cofania (5 min)'
				: 'Nie ma czego cofać';
			return { ok: false, error: msg };
		}
		return { ok: true };
	}
};
