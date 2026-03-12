import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getGlobalSettings, getActiveDrop, createOrderWithSoftLock } from '$lib/server/db/queries';
import { validateDropIsOpen } from '$lib/server/orders';

export const load: PageServerLoad = async ({ parent }) => {
	const { settings, activeDrop } = await parent();
	return { settings, activeDrop };
};

export const actions: Actions = {
	checkout: async ({ request }) => {
		const data = await request.formData();
		const cartJson = data.get('cart') as string | null;
		const email = (data.get('email') as string | null)?.trim();
		const phone = (data.get('phone') as string | null)?.trim();
		const inpostPointId = (data.get('inpost_point_id') as string | null)?.trim();

		// Basic field validation
		if (!email || !phone || !inpostPointId || !cartJson) {
			return fail(400, { error: 'Wypełnij wszystkie pola.' });
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Nieprawidłowy adres e-mail.' });
		}

		let cartLines: Array<{ variantId: number; quantity: number }>;
		try {
			cartLines = JSON.parse(cartJson);
			if (!Array.isArray(cartLines) || cartLines.length === 0) throw new Error();
		} catch {
			return fail(400, { error: 'Pusty lub błędny koszyk.' });
		}

		// Fresh server-side checks
		const [settings, activeDrop] = await Promise.all([getGlobalSettings(), getActiveDrop()]);

		if (!settings.printer_is_on) {
			return fail(400, {
				error: `Drukarnia jest offline. ${settings.status_message || ''}`
			});
		}

		const dropCheck = validateDropIsOpen(activeDrop, new Date());
		if (!dropCheck.ok) {
			return fail(400, { error: 'Brak aktywnego dropu — nie można teraz zamówić.' });
		}

		const result = await createOrderWithSoftLock({
			dropId: dropCheck.drop.id,
			customerEmail: email,
			customerPhone: phone,
			inpostPointId,
			cartLines,
			bufferMinutes: settings.turnaround_buffer_minutes,
			mysteryBoxMinutes: settings.mystery_box_minutes
		});

		if (!result.ok) {
			if (result.reason === 'INSUFFICIENT_CAPACITY') {
				return fail(400, {
					error: 'Brakuje czasu produkcji w tym dropie. Spróbuj zmniejszyć koszyk.'
				});
			}
			return fail(400, { error: 'Nie można przetworzyć zamówienia. Spróbuj ponownie.' });
		}

		// Phase 4: call payment gateway here (currently stubbed)
		// const blikSession = await initiateBlilPayment(result.orderId, result.totalPln);

		// Return orderId to client — page switches to BLIK timer view
		return { orderId: result.orderId, totalPln: result.totalPln };
	}
};
