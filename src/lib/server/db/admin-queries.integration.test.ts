/**
 * Integration tests for admin DB queries.
 * Requires a live DATABASE_URL connection.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	updateGlobalSettings,
	getGlobalSettings,
	getOrdersWithFilters,
	markOrderAsShipped,
	refundOrder,
	getDashboardStats,
	createOrderWithSoftLock,
	confirmPayment
} from './queries';
import {
	createTestSetup,
	cleanupTestData,
	ensureGlobalSettings
} from '$lib/test-helpers/db-setup';
import { db } from './index';
import { drop as dropTable, order } from './schema';
import { eq } from 'drizzle-orm';

let dropId: number;
let productId: number;
let variantId: number;

beforeEach(async () => {
	await ensureGlobalSettings();
	({ dropId, productId, variantId } = await createTestSetup());
});

afterEach(async () => {
	await cleanupTestData({ dropId, productId, variantId });
});

// ─── Global Settings ──────────────────────────────────────────────────────────

describe('updateGlobalSettings', () => {
	it('toggles printer_is_on', async () => {
		const current = await getGlobalSettings();
		const updated = await updateGlobalSettings({ printer_is_on: !current.printer_is_on });
		expect(updated.printer_is_on).toBe(!current.printer_is_on);
		// Restore
		await updateGlobalSettings({ printer_is_on: current.printer_is_on });
	});

	it('updates status_message', async () => {
		const updated = await updateGlobalSettings({ status_message: 'Drukarka w trakcie naprawy' });
		expect(updated.status_message).toBe('Drukarka w trakcie naprawy');
		await updateGlobalSettings({ status_message: '' });
	});
});

// ─── Order Filters ────────────────────────────────────────────────────────────

describe('getOrdersWithFilters', () => {
	it('returns all orders when no filter given', async () => {
		// Create a pending order
		await createOrderWithSoftLock({
			dropId,
			customerEmail: 'filter@test.pl',
			customerPhone: '600000001',
			inpostPointId: 'WAW01',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		const orders = await getOrdersWithFilters({});
		expect(orders.length).toBeGreaterThanOrEqual(1);
	});

	it('filters by status', async () => {
		await createOrderWithSoftLock({
			dropId,
			customerEmail: 'filter@test.pl',
			customerPhone: '600000001',
			inpostPointId: 'WAW01',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		const pendingOrders = await getOrdersWithFilters({ status: 'PENDING_PAYMENT' });
		expect(pendingOrders.every((o) => o.status === 'PENDING_PAYMENT')).toBe(true);

		const paidOrders = await getOrdersWithFilters({ status: 'PAID' });
		expect(paidOrders.every((o) => o.status === 'PAID')).toBe(true);
	});

	it('filters by dropId', async () => {
		await createOrderWithSoftLock({
			dropId,
			customerEmail: 'filter@test.pl',
			customerPhone: '600000001',
			inpostPointId: 'WAW01',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		const dropOrders = await getOrdersWithFilters({ dropId });
		expect(dropOrders.every((o) => o.drop_id === dropId)).toBe(true);

		const otherDropOrders = await getOrdersWithFilters({ dropId: 999999 });
		expect(otherDropOrders.length).toBe(0);
	});
});

// ─── Mark as Shipped ──────────────────────────────────────────────────────────

describe('markOrderAsShipped', () => {
	async function createPackedOrder(): Promise<string> {
		const result = await createOrderWithSoftLock({
			dropId,
			customerEmail: 'ship@test.pl',
			customerPhone: '600000002',
			inpostPointId: 'WAW02',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		if (!result.ok) throw new Error('Order creation failed');
		// Manually advance to PACKED via DB
		await db.update(order).set({ status: 'PACKED' }).where(eq(order.id, result.orderId));
		return result.orderId;
	}

	it('ships a PACKED order and sets tracking number', async () => {
		const orderId = await createPackedOrder();
		const result = await markOrderAsShipped(orderId, 'INPOST123456789');
		expect(result.ok).toBe(true);
		const [updated] = await db.select().from(order).where(eq(order.id, orderId));
		expect(updated.status).toBe('SHIPPED');
		expect(updated.tracking_number).toBe('INPOST123456789');
	});

	it('returns INVALID_STATUS for non-PACKED order', async () => {
		const result1 = await createOrderWithSoftLock({
			dropId,
			customerEmail: 'ship@test.pl',
			customerPhone: '600000002',
			inpostPointId: 'WAW02',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		if (!result1.ok) throw new Error('Order creation failed');
		const result = await markOrderAsShipped(result1.orderId, 'TRK');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('INVALID_STATUS');
	});

	it('returns ORDER_NOT_FOUND for unknown orderId', async () => {
		const result = await markOrderAsShipped('00000000-0000-0000-0000-000000000000', 'TRK');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('ORDER_NOT_FOUND');
	});
});

// ─── Refund ───────────────────────────────────────────────────────────────────

describe('refundOrder', () => {
	it('refunds a PAID order and restores capacity', async () => {
		const result = await createOrderWithSoftLock({
			dropId,
			customerEmail: 'refund@test.pl',
			customerPhone: '600000003',
			inpostPointId: 'WAW03',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		if (!result.ok) throw new Error('Order creation failed');
		// Confirm payment
		await db
			.update(order)
			.set({ status: 'PAID', payment_gateway_id: 'gw-refund-test', locked_until: null })
			.where(eq(order.id, result.orderId));

		// Get allocated before
		const [dropBefore] = await db
			.select({ allocated: order.locked_minutes })
			.from(order)
			.where(eq(order.id, result.orderId));
		const lockedMinutes = dropBefore.allocated;

		const refundResult = await refundOrder(result.orderId);
		expect(refundResult.ok).toBe(true);

		const [updated] = await db.select().from(order).where(eq(order.id, result.orderId));
		expect(updated.status).toBe('REFUNDED');

		// Check capacity restored
		const [dropRow] = await db.select().from(dropTable).where(eq(dropTable.id, dropId));
		expect(dropRow.allocated_minutes).toBe(0); // was locked then released
		void lockedMinutes; // acknowledged
	});

	it('returns INVALID_STATUS for already CANCELLED order', async () => {
		const result = await createOrderWithSoftLock({
			dropId,
			customerEmail: 'refund@test.pl',
			customerPhone: '600000003',
			inpostPointId: 'WAW03',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		if (!result.ok) throw new Error();
		await db.update(order).set({ status: 'CANCELLED', locked_until: null }).where(eq(order.id, result.orderId));

		const refundResult = await refundOrder(result.orderId);
		expect(refundResult.ok).toBe(false);
		if (!refundResult.ok) expect(refundResult.reason).toBe('INVALID_STATUS');
	});

	it('returns ORDER_NOT_FOUND for unknown id', async () => {
		const result = await refundOrder('00000000-0000-0000-0000-000000000000');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('ORDER_NOT_FOUND');
	});
});

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

describe('getDashboardStats', () => {
	it('returns stats with correct shape', async () => {
		const stats = await getDashboardStats();
		expect(typeof stats.totalOrders).toBe('number');
		expect(typeof stats.pendingOrders).toBe('number');
		expect(typeof stats.paidOrders).toBe('number');
		// activeDropId may be null or a number
		expect(stats.activeDropId === null || typeof stats.activeDropId === 'number').toBe(true);
	});
});
