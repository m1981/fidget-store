import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getOrderWithItems, markOrderAsShipped, refundOrder } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params }) => {
	const orderData = await getOrderWithItems(params.id);
	if (!orderData) error(404, 'Zamówienie nie istnieje');
	return { orderData };
};

export const actions: Actions = {
	ship: async ({ request, params }) => {
		const data = await request.formData();
		const trackingNumber = data.get('tracking_number')?.toString().trim() ?? '';

		if (!trackingNumber) {
			return fail(400, { error: 'Podaj numer listu przewozowego', action: 'ship' });
		}

		const result = await markOrderAsShipped(params.id, trackingNumber);
		if (!result.ok) {
			if (result.reason === 'INVALID_STATUS') {
				return fail(400, { error: 'Zamówienie nie jest gotowe do wysyłki (musi być w statusie PACKED)', action: 'ship' });
			}
			return fail(404, { error: 'Zamówienie nie istnieje', action: 'ship' });
		}

		return { success: true, action: 'ship' };
	},

	refund: async ({ params }) => {
		const result = await refundOrder(params.id);
		if (!result.ok) {
			if (result.reason === 'INVALID_STATUS') {
				return fail(400, { error: 'Tego zamówienia nie można zwrócić (status nie pozwala)', action: 'refund' });
			}
			return fail(404, { error: 'Zamówienie nie istnieje', action: 'refund' });
		}

		return { success: true, action: 'refund' };
	}
};
