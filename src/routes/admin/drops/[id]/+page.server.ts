import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getAllDrops,
	updateDrop,
	publishDrop,
	closeDrop,
	setDropProducts,
	getAllActiveProducts,
	getDropProductsAdmin
} from '$lib/server/db/queries';
import { db } from '$lib/server/db';
import { drop } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const dropId = parseInt(params.id, 10);
	if (isNaN(dropId)) error(404, 'Drop nie istnieje');

	const [dropRow] = await db.select().from(drop).where(eq(drop.id, dropId));
	if (!dropRow) error(404, 'Drop nie istnieje');

	const [dropProducts, allProducts] = await Promise.all([
		getDropProductsAdmin(dropId),
		getAllActiveProducts()
	]);

	return { drop: dropRow, dropProducts, allProducts };
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const dropId = parseInt(params.id, 10);
		const data = await request.formData();
		const opensAt = data.get('opens_at')?.toString() ?? '';
		const closesAt = data.get('closes_at')?.toString() ?? '';
		const capacityStr = data.get('total_capacity_minutes')?.toString() ?? '';

		if (!opensAt || !closesAt || !capacityStr) {
			return fail(400, { error: 'Wypełnij wszystkie pola', action: 'update' });
		}
		const opensAtDate = new Date(opensAt);
		const closesAtDate = new Date(closesAt);
		const capacity = parseInt(capacityStr, 10);

		if (isNaN(opensAtDate.getTime()) || isNaN(closesAtDate.getTime()) || isNaN(capacity) || capacity <= 0) {
			return fail(400, { error: 'Nieprawidłowe dane', action: 'update' });
		}
		if (closesAtDate <= opensAtDate) {
			return fail(400, { error: 'Data zamknięcia musi być późniejsza niż otwarcia', action: 'update' });
		}

		const result = await updateDrop(dropId, {
			opens_at: opensAtDate,
			closes_at: closesAtDate,
			total_capacity_minutes: capacity
		});
		if (!result.ok) {
			return fail(400, {
				error: result.reason === 'NOT_DRAFT' ? 'Można edytować tylko dropy w statusie Szkic' : 'Drop nie istnieje',
				action: 'update'
			});
		}
		return { success: true, action: 'update' };
	},

	assignProducts: async ({ request, params }) => {
		const dropId = parseInt(params.id, 10);
		const data = await request.formData();
		const productIds = data.getAll('product_ids').map((v) => parseInt(v.toString(), 10)).filter((n) => !isNaN(n));
		await setDropProducts(dropId, productIds);
		return { success: true, action: 'assignProducts' };
	},

	publish: async ({ params }) => {
		const dropId = parseInt(params.id, 10);
		const result = await publishDrop(dropId);
		if (!result.ok) {
			return fail(400, {
				error: result.reason === 'NOT_DRAFT' ? 'Drop nie jest w statusie Szkic' : 'Drop nie istnieje',
				action: 'publish'
			});
		}
		return { success: true, action: 'publish' };
	},

	close: async ({ params }) => {
		const dropId = parseInt(params.id, 10);
		const result = await closeDrop(dropId);
		if (!result.ok) {
			return fail(400, {
				error: result.reason === 'NOT_ACTIVE' ? 'Drop nie jest aktywny' : 'Drop nie istnieje',
				action: 'close'
			});
		}
		return { success: true, action: 'close' };
	}
};
