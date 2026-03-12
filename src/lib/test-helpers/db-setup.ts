/**
 * Test Database Setup Helpers
 * 
 * Provides utilities for setting up and tearing down test data
 * in integration tests.
 */

import { db } from '$lib/server/db';
import { sql, eq } from 'drizzle-orm';
import {
	drop,
	product,
	productVariant,
	order,
	orderItem,
	dropProduct,
	globalSettings
} from '$lib/server/db/schema';
import type { NewDrop, NewProduct, NewProductVariant } from '$lib/server/db/schema';

// ─── Test Data Cleanup ────────────────────────────────────────────────────────

/**
 * Cleans up test data for specific IDs.
 * Use in afterEach() hooks with the IDs from your test setup.
 */
export async function cleanupTestData(ids?: { dropId?: number; productId?: number; variantId?: number }) {
	if (!ids) {
		// If no IDs provided, delete all test data (use with caution!)
		await db.delete(orderItem);
		await db.delete(order);
		await db.delete(dropProduct);
		await db.delete(productVariant);
		await db.delete(product);
		await db.delete(drop);
		return;
	}

	// Delete in correct order to respect foreign key constraints
	if (ids.dropId) {
		// Delete orders for this drop
		const orders = await db.select({ id: order.id }).from(order).where(eq(order.drop_id, ids.dropId));
		for (const o of orders) {
			await db.delete(orderItem).where(eq(orderItem.order_id, o.id));
		}
		await db.delete(order).where(eq(order.drop_id, ids.dropId));

		// Delete drop_product links
		await db.delete(dropProduct).where(eq(dropProduct.drop_id, ids.dropId));

		// Delete the drop
		await db.delete(drop).where(eq(drop.id, ids.dropId));
	}

	if (ids.variantId) {
		await db.delete(productVariant).where(eq(productVariant.id, ids.variantId));
	}

	if (ids.productId) {
		// Delete any remaining variants
		await db.delete(productVariant).where(eq(productVariant.product_id, ids.productId));
		// Delete drop_product links
		await db.delete(dropProduct).where(eq(dropProduct.product_id, ids.productId));
		// Delete the product
		await db.delete(product).where(eq(product.id, ids.productId));
	}
}

/**
 * Truncates all tables and resets sequences.
 * WARNING: This deletes ALL data including global_settings.
 * Only use in isolated test environments.
 */
export async function truncateAllTables() {
	await db.execute(
		sql`TRUNCATE TABLE order_item, "order", drop_product, product_variant, product, drop, global_settings RESTART IDENTITY CASCADE`
	);
}

// ─── Test Data Factories ──────────────────────────────────────────────────────

/**
 * Creates a test drop with sensible defaults.
 */
export async function createTestDrop(overrides?: Partial<NewDrop>): Promise<number> {
	const now = new Date();
	const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

	const [newDrop] = await db
		.insert(drop)
		.values({
			status: 'ACTIVE',
			opens_at: now,
			closes_at: oneWeekLater,
			total_capacity_minutes: 600,
			allocated_minutes: 0,
			...overrides
		})
		.returning({ id: drop.id });

	return newDrop.id;
}

/**
 * Creates a test product with sensible defaults.
 */
export async function createTestProduct(overrides?: Partial<NewProduct>): Promise<number> {
	const [newProduct] = await db
		.insert(product)
		.values({
			name: 'Test Dragon',
			description: 'A test fidget dragon',
			print_duration_minutes: 60,
			price_pln: 2990,
			inpost_gabaryt: 'A',
			is_active: true,
			...overrides
		})
		.returning({ id: product.id });

	return newProduct.id;
}

/**
 * Creates a test product variant with sensible defaults.
 */
export async function createTestVariant(
	productId: number,
	overrides?: Partial<NewProductVariant>
): Promise<number> {
	const [newVariant] = await db
		.insert(productVariant)
		.values({
			product_id: productId,
			filament_color: 'Test Blue',
			hex_code: '#0000FF',
			is_mystery: false,
			is_active: true,
			...overrides
		})
		.returning({ id: productVariant.id });

	return newVariant.id;
}

/**
 * Creates a complete test setup: drop + product + variant.
 * Returns all IDs for use in tests.
 */
export async function createTestSetup() {
	const dropId = await createTestDrop();
	const productId = await createTestProduct();
	const variantId = await createTestVariant(productId);

	// Link product to drop
	await db.insert(dropProduct).values({
		drop_id: dropId,
		product_id: productId
	});

	return { dropId, productId, variantId };
}

/**
 * Ensures global_settings row exists for tests.
 */
export async function ensureGlobalSettings() {
	const existing = await db.select().from(globalSettings).where(eq(globalSettings.id, 1));

	if (existing.length === 0) {
		await db.insert(globalSettings).values({
			id: 1,
			printer_is_on: true,
			status_message: 'Test mode',
			active_window_start_hour: 8,
			active_window_end_hour: 18,
			turnaround_buffer_minutes: 30,
			mystery_box_minutes: 120
		});
	}
}

// ─── Test Data Getters ────────────────────────────────────────────────────────

/**
 * Gets the current allocated minutes for a drop.
 */
export async function getDropAllocatedMinutes(dropId: number): Promise<number> {
	const [result] = await db.select().from(drop).where(eq(drop.id, dropId));
	return result?.allocated_minutes ?? 0;
}

