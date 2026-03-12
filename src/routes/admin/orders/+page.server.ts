import type { PageServerLoad } from './$types';
import { getOrdersWithFilters } from '$lib/server/db/queries';
import type { OrderStatus } from '$lib/server/db/schema';

const VALID_STATUSES: OrderStatus[] = [
	'PENDING_PAYMENT', 'PAID', 'PRINTING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'
];

export const load: PageServerLoad = async ({ url }) => {
	const statusParam = url.searchParams.get('status');
	const status = (VALID_STATUSES.includes(statusParam as OrderStatus) ? statusParam : undefined) as
		| OrderStatus
		| undefined;

	const orders = await getOrdersWithFilters({ status });
	return { orders, activeStatus: status ?? null };
};
