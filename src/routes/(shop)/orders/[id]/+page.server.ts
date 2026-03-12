import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrderWithItems } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params }) => {
	const orderData = await getOrderWithItems(params.id);
	if (!orderData) error(404, 'Zamówienie nie znalezione');
	return { orderData };
};
