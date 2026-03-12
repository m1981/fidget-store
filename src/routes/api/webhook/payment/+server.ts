/**
 * Payment gateway webhook endpoint.
 *
 * Phase 1: structure and order state machine in place; signature verification stubbed.
 * Phase 4: replace the stub with real PayU/Przelewy24 signature check.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { confirmPayment } from '$lib/server/db/queries';

interface PaymentWebhookPayload {
	event: 'PAYMENT_CONFIRMED' | 'PAYMENT_FAILED' | string;
	paymentId: string;
}

export const POST: RequestHandler = async ({ request }) => {
	// Phase 4 TODO: verify gateway signature
	// const signature = request.headers.get('x-payu-signature');
	// if (!verifySignature(await request.text(), signature)) error(401, 'Invalid signature');

	let payload: PaymentWebhookPayload;
	try {
		payload = await request.json();
	} catch {
		error(400, 'Invalid JSON payload');
	}

	if (payload.event !== 'PAYMENT_CONFIRMED') {
		// Acknowledge non-confirmation events without acting on them
		return json({ received: true });
	}

	if (!payload.paymentId) {
		error(400, 'Missing paymentId');
	}

	const result = await confirmPayment(payload.paymentId);

	if (!result.ok) {
		// Log but return 200 — gateway should not retry on order-not-found
		console.error('[webhook/payment] ORDER_NOT_FOUND for paymentId', payload.paymentId);
		return json({ received: true, warning: 'order not found' });
	}

	console.info('[webhook/payment] Order confirmed:', result.orderId);
	return json({ received: true, orderId: result.orderId });
};
