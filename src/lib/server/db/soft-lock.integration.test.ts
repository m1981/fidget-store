/**
 * Integration Tests: Soft Lock Mechanism
 * 
 * Tests the atomic soft lock behavior when creating orders.
 * This is the critical path for preventing overselling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './index';
import { createOrderWithSoftLock, confirmPayment } from './queries';
import { drop, order } from './schema';
import { eq } from 'drizzle-orm';
import {
	createTestSetup,
	cleanupTestData,
	getDropAllocatedMinutes,
	ensureGlobalSettings
} from '$lib/test-helpers/db-setup';

describe('Soft Lock Integration Tests', () => {
	let testDropId: number;
	let testProductId: number;
	let testVariantId: number;

	beforeEach(async () => {
		// Ensure global settings exist
		await ensureGlobalSettings();

		// Create test data
		const setup = await createTestSetup();
		testDropId = setup.dropId;
		testProductId = setup.productId;
		testVariantId = setup.variantId;
	});

	afterEach(async () => {
		await cleanupTestData({ dropId: testDropId, productId: testProductId, variantId: testVariantId });
	});

	describe('createOrderWithSoftLock', () => {
		it('should create order and apply soft lock to drop capacity', async () => {
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

			expect(result.orderId).toBeDefined();
			expect(result.totalPln).toBe(2990); // Default test product price

			// Verify capacity was deducted (60 min print + 30 min buffer = 90 min)
			const allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(90);
		});

		it('should create order with correct locked_minutes and locked_until', async () => {
			const beforeCreate = new Date();

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

			// Verify order has soft lock fields set
			const [orderRow] = await db.select().from(order).where(eq(order.id, result.orderId));

			expect(orderRow.locked_minutes).toBe(90);
			expect(orderRow.locked_until).toBeDefined();

			// Verify locked_until is ~3 minutes in the future
			const lockedUntil = new Date(orderRow.locked_until!);
			const expectedExpiry = new Date(beforeCreate.getTime() + 3 * 60 * 1000);
			const timeDiff = Math.abs(lockedUntil.getTime() - expectedExpiry.getTime());
			expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
		});

		it('should reject order when capacity is insufficient', async () => {
			// Pre-allocate most capacity (600 total - 550 allocated = 50 remaining)
			await db.update(drop).set({ allocated_minutes: 550 }).where(eq(drop.id, testDropId));

			const result = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [{ variantId: testVariantId, quantity: 1 }], // Needs 90 min
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			expect(result.ok).toBe(false);
			if (result.ok) return;

			expect(result.reason).toBe('INSUFFICIENT_CAPACITY');

			// Verify capacity was NOT deducted
			const allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(550); // Unchanged
		});

		it('should allow exact capacity fit', async () => {
			// Set capacity to exactly what we need (90 min)
			await db
				.update(drop)
				.set({ total_capacity_minutes: 90, allocated_minutes: 0 })
				.where(eq(drop.id, testDropId));

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

			// Verify capacity is now fully allocated
			const allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(90);
		});

		it('should handle multiple items in cart', async () => {
			const result = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [
					{ variantId: testVariantId, quantity: 2 }, // 2 items
				],
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			expect(result.ok).toBe(true);
			if (!result.ok) return;

			// Verify capacity: (60 + 30) + (60 + 30) = 180 min
			const allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(180);
		});
	});

	describe('confirmPayment', () => {
		it('should convert soft lock to hard lock and update order status', async () => {
			// Create an order with soft lock
			const createResult = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [{ variantId: testVariantId, quantity: 1 }],
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			expect(createResult.ok).toBe(true);
			if (!createResult.ok) return;

			// Set payment gateway ID (simulating BLIK initiation)
			await db
				.update(order)
				.set({ payment_gateway_id: 'test-payment-123' })
				.where(eq(order.id, createResult.orderId));

			// Confirm payment
			const confirmResult = await confirmPayment('test-payment-123');

			expect(confirmResult.ok).toBe(true);
			if (!confirmResult.ok) return;

			expect(confirmResult.orderId).toBe(createResult.orderId);

			// Verify order status updated
			const [orderRow] = await db.select().from(order).where(eq(order.id, createResult.orderId));

			expect(orderRow.status).toBe('PAID');
			expect(orderRow.locked_until).toBeNull(); // Soft lock cleared
			expect(orderRow.payment_gateway_id).toBe('test-payment-123');

			// Verify capacity is still allocated (hard lock)
			const allocatedMinutes = await getDropAllocatedMinutes(testDropId);
			expect(allocatedMinutes).toBe(90);
		});

		it('should reject confirmation for non-existent payment', async () => {
			const result = await confirmPayment('non-existent-payment-id');

			expect(result.ok).toBe(false);
			if (result.ok) return;

			expect(result.reason).toBe('ORDER_NOT_FOUND');
		});

		it('should not confirm already paid order', async () => {
			// Create and immediately confirm an order
			const createResult = await createOrderWithSoftLock({
				dropId: testDropId,
				customerEmail: 'test@example.com',
				customerPhone: '+48123456789',
				inpostPointId: 'KRA01M',
				cartLines: [{ variantId: testVariantId, quantity: 1 }],
				bufferMinutes: 30,
				mysteryBoxMinutes: 120
			});

			expect(createResult.ok).toBe(true);
			if (!createResult.ok) return;

			await db
				.update(order)
				.set({ payment_gateway_id: 'test-payment-456', status: 'PAID' })
				.where(eq(order.id, createResult.orderId));

			// Try to confirm again
			const confirmResult = await confirmPayment('test-payment-456');

			expect(confirmResult.ok).toBe(false);
			if (confirmResult.ok) return;

			expect(confirmResult.reason).toBe('ORDER_NOT_FOUND');
		});
	});
});

