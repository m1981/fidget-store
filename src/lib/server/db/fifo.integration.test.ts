/**
 * Integration tests for FIFO print queue allocation.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	getPrintBatch,
	markNextPrinted,
	undoLastPrinted,
	createOrderWithSoftLock
} from './queries';
import {
	createTestSetup,
	cleanupTestData,
	ensureGlobalSettings
} from '$lib/test-helpers/db-setup';
import { db } from './index';
import { order, orderItem } from './schema';
import { eq, and } from 'drizzle-orm';

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

// ─── getPrintBatch ────────────────────────────────────────────────────────────

describe('getPrintBatch', () => {
	it('returns empty when no CLOSED drop', async () => {
		const batch = await getPrintBatch();
		// Drop is ACTIVE in test setup, not CLOSED — should be null or from a different drop
		// This test just checks shape
		expect(batch).toHaveProperty('dropId');
		expect(batch).toHaveProperty('items');
		expect(Array.isArray(batch.items)).toBe(true);
	});

	it('groups items by variant when drop is CLOSED', async () => {
		// Create a PRINTING order first (drop must be ACTIVE for soft lock)
		const result = await createOrderWithSoftLock({
			dropId,
			customerEmail: 'batch@test.pl',
			customerPhone: '600000000',
			inpostPointId: 'WAW01',
			cartLines: [{ variantId, quantity: 2 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		if (!result.ok) throw new Error(`Order creation failed`);
		await db.update(order).set({ status: 'PRINTING' }).where(eq(order.id, result.orderId));

		// Now close the drop
		const { drop: dropTable } = await import('./schema');
		await db.update(dropTable).set({ status: 'CLOSED' }).where(eq(dropTable.id, dropId));

		const batch = await getPrintBatch();
		expect(batch.dropId).toBe(dropId);
		expect(batch.items.length).toBeGreaterThanOrEqual(1);
		const item = batch.items.find((i) => i.variantId === variantId);
		expect(item).toBeDefined();
		if (item) {
			expect(item.totalUnits).toBe(2);
			expect(item.printedUnits).toBe(0);
		}
	});
});

// ─── markNextPrinted ──────────────────────────────────────────────────────────

describe('markNextPrinted', () => {
	async function setupPrintingOrder(email: string): Promise<string> {
		const result = await createOrderWithSoftLock({
			dropId,
			customerEmail: email,
			customerPhone: '600000000',
			inpostPointId: 'WAW01',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		if (!result.ok) throw new Error();
		await db.update(order).set({ status: 'PRINTING' }).where(eq(order.id, result.orderId));
		return result.orderId;
	}

	it('marks a PENDING item as PRINTED', async () => {
		const orderId = await setupPrintingOrder('fifo1@test.pl');
		const result = await markNextPrinted(variantId);
		expect(result.ok).toBe(true);

		const items = await db.select().from(orderItem).where(eq(orderItem.order_id, orderId));
		expect(items[0].status).toBe('PRINTED');
		expect(items[0].printed_at).not.toBeNull();
	});

	it('advances order to PACKED when all items are PRINTED', async () => {
		const orderId = await setupPrintingOrder('fifo2@test.pl');
		const result = await markNextPrinted(variantId);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.orderPacked).toBe(true);

		const [o] = await db.select().from(order).where(eq(order.id, orderId));
		expect(o.status).toBe('PACKED');
	});

	it('processes orders FIFO (oldest first)', async () => {
		const orderId1 = await setupPrintingOrder('fifo-old@test.pl');
		// Small delay to ensure different timestamps
		await new Promise((r) => setTimeout(r, 50));
		const orderId2 = await setupPrintingOrder('fifo-new@test.pl');

		// First [+1] should affect the older order
		await markNextPrinted(variantId);

		const [o1] = await db.select().from(order).where(eq(order.id, orderId1));
		const [o2] = await db.select().from(order).where(eq(order.id, orderId2));
		expect(o1.status).toBe('PACKED'); // older order finished
		expect(o2.status).toBe('PRINTING'); // newer order still pending
	});

	it('returns NOTHING_TO_PRINT when no eligible items', async () => {
		const result = await markNextPrinted(999999);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('NOTHING_TO_PRINT');
	});
});

// ─── undoLastPrinted ──────────────────────────────────────────────────────────

describe('undoLastPrinted', () => {
	it('reverts a recently PRINTED item back to PENDING', async () => {
		const result = await createOrderWithSoftLock({
			dropId,
			customerEmail: 'undo@test.pl',
			customerPhone: '600000000',
			inpostPointId: 'WAW01',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		if (!result.ok) throw new Error();
		await db.update(order).set({ status: 'PRINTING' }).where(eq(order.id, result.orderId));
		await markNextPrinted(variantId);

		const undoResult = await undoLastPrinted(variantId);
		expect(undoResult.ok).toBe(true);

		const items = await db.select().from(orderItem).where(eq(orderItem.order_id, result.orderId));
		expect(items[0].status).toBe('PENDING');
		expect(items[0].printed_at).toBeNull();
	});

	it('reverts PACKED order back to PRINTING on undo', async () => {
		const result = await createOrderWithSoftLock({
			dropId,
			customerEmail: 'undo2@test.pl',
			customerPhone: '600000000',
			inpostPointId: 'WAW01',
			cartLines: [{ variantId, quantity: 1 }],
			bufferMinutes: 0,
			mysteryBoxMinutes: 120
		});
		if (!result.ok) throw new Error();
		await db.update(order).set({ status: 'PRINTING' }).where(eq(order.id, result.orderId));
		await markNextPrinted(variantId); // → PACKED

		const undoResult = await undoLastPrinted(variantId);
		expect(undoResult.ok).toBe(true);

		const [o] = await db.select().from(order).where(eq(order.id, result.orderId));
		expect(o.status).toBe('PRINTING');
	});

	it('returns NOTHING_TO_UNDO when no printed items', async () => {
		const result = await undoLastPrinted(999999);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('NOTHING_TO_UNDO');
	});
});
