import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProductWithVariants } from '$lib/server/db/queries';

export const load: PageServerLoad = async ({ params, parent }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id < 1) error(404, 'Produkt nie znaleziony');

	const [productData, { activeDrop, settings }] = await Promise.all([
		getProductWithVariants(id),
		parent()
	]);

	if (!productData) error(404, 'Produkt nie znaleziony');

	return { productData, activeDrop, settings };
};
