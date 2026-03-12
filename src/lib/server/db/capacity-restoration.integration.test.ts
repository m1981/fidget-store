/**
 * Integration Tests: Capacity Restoration
 * 
 * Tests that capacity is correctly restored when:
 * - Soft locks expire (BLIK timeout)
 * - Orders are refunded
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './index';
import { createOrderWithSoftLock, releaseExpiredSoftLocks } from './queries';
import { order } from './schema';
import { eq } from 'drizzle-orm';
import {
	createTestSetup,
	cleanupTestData,
	getDropAllocatedMinutes,
	ensureGlobalSettings
} from '$lib/test-helpers/db-setup';

describe('Capacity Restoration Integration Tests', () => {
	let testDropId: number;
	let testProductId: number;
	let testVariantId: number;

	beforeEach(async () => {
		await ensureGlobalSettings();
		const setup = await createTestSetup();
		testDropId = setup.dropId;
		testProductId = setup.productId;
		testVariantId = setup.variantId;
	});

	afterEach(async () => {
		await cleanupTestData({ dropId: testDropId, productId: testProductId, variantId: testVariantId });
	});

	describe('releaseExpiredSoftLocks', () => {
		it('should release capacity when soft lock expires', async () => {
			// Create an order with soft lock
			const result = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [{ variantId: testVariantId, quantity: 1 }],
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;

			// Verify capacity is allocated
			let allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(90);

			// Manually expire the soft lock (set locked_until to past)
			const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
			await db
				.update(order)
				.set({ locked_until: pastDate })
				.where(eq(order.id, result.orderId));

			// Release expired locks
			const releaseResult = await releaseExpiredSoftLocks();

			expect(releaseResult.released).toBe(1);

			// Verify capacity was restored
			allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(0);

			// Verify order status changed to CANCELLED
			const [orderRow] = await db.select().from(order).where(eq(order.id, result.orderId));
			expect(orderRow.status).toBe('CANCELLED');
			expect(orderRow.locked_until).toBeNull();
		});

		it('should handle multiple expired soft locks', async () => {
			// Create 3 orders
			const order1 = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test1@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [{ variantId: testVariantId, quantity: 1 }],
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			const order2 = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test2@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [{ variantId: testVariantId, quantity: 1 }],
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			const order3 = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test3@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [{ variantId: testVariantId, quantity: 1 }],
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			expect(order1.ok && order2.ok && order3.ok).toBe(true);

			// Verify total capacity allocated: 3 * 90 = 270
			let allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(270);

			// Expire all 3 orders
			const pastDate = new Date(Date.now() - 10 * 60 * 1000);
			if (order1.ok) {
				await db.update(order).set({ locked_until: pastDate }).where(eq(order.id, order1.orderId));
			}
			if (order2.ok) {
				await db.update(order).set({ locked_until: pastDate }).where(eq(order.id, order2.orderId));
			}
			if (order3.ok) {
				await db.update(order).set({ locked_until: pastDate }).where(eq(order.id, order3.orderId));
			}

			// Release all expired locks
			const releaseResult = await releaseExpiredSoftLocks();

			expect(releaseResult.released).toBe(3);

			// Verify all capacity was restored
			allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(0);
		});

		it('should not release non-expired soft locks', async () => {
			// Create an order with soft lock
			const result = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [{ variantId: testVariantId, quantity: 1 }],
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;

			// Don't expire the lock - it should still be valid

			// Try to release expired locks
			const releaseResult = await releaseExpiredSoftLocks();

			expect(releaseResult.released).toBe(0);

			// Verify capacity is still allocated
			const allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(90);

			// Verify order is still PENDING_PAYMENT
			const [orderRow] = await db.select().from(order).where(eq(order.id, result.orderId));
			expect(orderRow.status).toBe('PENDING_PAYMENT');
		});
	});
});

