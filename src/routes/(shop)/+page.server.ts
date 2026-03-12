import type { PageServerLoad } from './$types';
import { getDropProducts } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ parent }) => {
	const { activeDrop } = await parent();

	const products = activeDrop ? await getDropProducts(activeDrop.id) : [];

	return { products };
};
