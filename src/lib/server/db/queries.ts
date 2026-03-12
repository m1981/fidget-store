/**
 * All database interactions for the application.
 * Route files import from here — keeps server routes lean.
 */
import { and, eq, lt, lte, gte, sql, isNotNull } from 'drizzle-orm';
import { db } from './index';
import {
	globalSettings,
	product,
	productVariant,
	drop,
	dropProduct,
	order,
	orderItem
} from './schema';
import type { GlobalSettings, Drop, Product, ProductVariant, Order, OrderItem } from './schema';
import { buildSoftLockExpiry } from '../orders';
import { calculateCartMinutes } from '../capacity';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductWithVariants {
	product: Product;
	variants: ProductVariant[];
}

export interface OrderWithItems {
	order: Order;
	items: Array<{
		item: OrderItem;
		variant: ProductVariant;
		product: Product;
	}>;
}

export interface CheckoutCartLine {
	variantId: number;
	quantity: number;
}

// ─── Global Settings ──────────────────────────────────────────────────────────

export async function getGlobalSettings(): Promise<GlobalSettings> {
	const [row] = await db.select().from(globalSettings).where(eq(globalSettings.id, 1));
	if (!row) throw new Error('global_settings row not found — run seed');
	return row;
}

// ─── Drop ─────────────────────────────────────────────────────────────────────

/** Returns the currently active drop (status=ACTIVE and within opens_at..closes_at), or null */
export async function getActiveDrop(): Promise<Drop | null> {
	const now = new Date();
	const [row] = await db
		.select()
		.from(drop)
		.where(
			and(
				eq(drop.status, 'ACTIVE'),
				lte(drop.opens_at, now),
				gte(drop.closes_at, now)
			)
		)
		.limit(1);
	return row ?? null;
}

// ─── Products ─────────────────────────────────────────────────────────────────

/** Returns all active products in a drop, each with their active variants */
export async function getDropProducts(dropId: number): Promise<ProductWithVariants[]> {
	const rows = await db
		.select({ product: product, variant: productVariant })
		.from(dropProduct)
		.innerJoin(product, eq(dropProduct.product_id, product.id))
		.leftJoin(productVariant, eq(productVariant.product_id, product.id))
		.where(
			and(
				eq(dropProduct.drop_id, dropId),
				eq(product.is_active, true),
				eq(productVariant.is_active, true)
			)
		)
		.orderBy(product.id);

	const map = new Map<number, ProductWithVariants>();
	for (const row of rows) {
		if (!map.has(row.product.id)) {
			map.set(row.product.id, { product: row.product, variants: [] });
		}
		if (row.variant) {
			map.get(row.product.id)!.variants.push(row.variant);
		}
	}
	return [...map.values()];
}

/** Returns a single product with all its active variants */
export async function getProductWithVariants(
	productId: number
): Promise<ProductWithVariants | null> {
	const rows = await db
		.select({ product: product, variant: productVariant })
		.from(product)
		.leftJoin(productVariant, and(eq(productVariant.product_id, product.id), eq(productVariant.is_active, true)))
		.where(and(eq(product.id, productId), eq(product.is_active, true)));

	if (rows.length === 0) return null;

	const variants = rows.flatMap((r) => (r.variant ? [r.variant] : []));
	return { product: rows[0].product, variants };
}

// ─── Orders ───────────────────────────────────────────────────────────────────

/** Returns an order with all its items (variant + product data included) */
export async function getOrderWithItems(orderId: string): Promise<OrderWithItems | null> {
	const [orderRow] = await db.select().from(order).where(eq(order.id, orderId));
	if (!orderRow) return null;

	const itemRows = await db
		.select({ item: orderItem, variant: productVariant, product: product })
		.from(orderItem)
		.innerJoin(productVariant, eq(orderItem.variant_id, productVariant.id))
		.innerJoin(product, eq(productVariant.product_id, product.id))
		.where(eq(orderItem.order_id, orderId));

	return {
		order: orderRow,
		items: itemRows
	};
}

/**
 * Creates a PENDING_PAYMENT order with an atomic soft lock on drop capacity.
 *
 * Uses a conditional UPDATE to increment `allocated_minutes` only if there is
 * enough remaining capacity — this is inherently atomic in Postgres.
 */
export async function createOrderWithSoftLock(params: {
	dropId: number;
	customerEmail: string;
	customerPhone: string;
	inpostPointId: string;
	cartLines: CheckoutCartLine[];
	bufferMinutes: number;
	mysteryBoxMinutes: number;
}): Promise<
	| { ok: true; orderId: string; totalPln: number }
	| { ok: false; reason: 'INSUFFICIENT_CAPACITY' | 'DROP_NOT_ACTIVE' }
> {
	const { dropId, customerEmail, customerPhone, inpostPointId, cartLines, bufferMinutes, mysteryBoxMinutes } =
		params;

	return await db.transaction(async (tx) => {
		// 1. Resolve variant/product info for cart items (server-side prices)
		const resolvedLines = await Promise.all(
			cartLines.map(async (line) => {
				const [row] = await tx
					.select({ variant: productVariant, product: product })
					.from(productVariant)
					.innerJoin(product, eq(productVariant.product_id, product.id))
					.where(
						and(
							eq(productVariant.id, line.variantId),
							eq(productVariant.is_active, true),
							eq(product.is_active, true)
						)
					);
				return row ? { ...line, variant: row.variant, product: row.product } : null;
			})
		);

		if (resolvedLines.some((l) => l === null)) {
			return { ok: false, reason: 'DROP_NOT_ACTIVE' };
		}
		const lines = resolvedLines as NonNullable<(typeof resolvedLines)[number]>[];

		// 2. Calculate capacity and total
		const cartItems = lines.map((l) => ({
			printDurationMinutes: l.variant.is_mystery ? mysteryBoxMinutes : l.product.print_duration_minutes,
			quantity: l.quantity
		}));
		const cartMinutes = calculateCartMinutes(cartItems, bufferMinutes);
		const totalPln = lines.reduce(
			(sum, l) => sum + l.product.price_pln * l.quantity,
			0
		);

		// 3. Atomic soft lock: increment allocated_minutes only if capacity allows
		const updated = await tx
			.update(drop)
			.set({ allocated_minutes: sql`allocated_minutes + ${cartMinutes}` })
			.where(
				and(
					eq(drop.id, dropId),
					eq(drop.status, 'ACTIVE'),
					sql`allocated_minutes + ${cartMinutes} <= total_capacity_minutes`
				)
			)
			.returning({ id: drop.id });

		if (updated.length === 0) {
			return { ok: false, reason: 'INSUFFICIENT_CAPACITY' };
		}

		// 4. Create order
		const now = new Date();
		const [newOrder] = await tx
			.insert(order)
			.values({
				drop_id: dropId,
				status: 'PENDING_PAYMENT',
				customer_email: customerEmail,
				customer_phone: customerPhone,
				inpost_point_id: inpostPointId,
				total_pln: totalPln,
				locked_minutes: cartMinutes,
				locked_until: buildSoftLockExpiry(now)
			})
			.returning({ id: order.id });

		// 5. Create order items
		await tx.insert(orderItem).values(
			lines.map((l) => ({
				order_id: newOrder.id,
				variant_id: l.variantId,
				quantity: l.quantity,
				status: 'PENDING' as const
			}))
		);

		return { ok: true, orderId: newOrder.id, totalPln };
	});
}

// ─── Admin: Drop Management ───────────────────────────────────────────────────

/** Returns all drops ordered by creation date (newest first) */
export async function getAllDrops(): Promise<Drop[]> {
	return await db.select().from(drop).orderBy(sql`created_at DESC`);
}

export async function createDrop(data: {
	opensAt: Date;
	closesAt: Date;
	totalCapacityMinutes: number;
}): Promise<number> {
	const [newDrop] = await db
		.insert(drop)
		.values({
			status: 'DRAFT',
			opens_at: data.opensAt,
			closes_at: data.closesAt,
			total_capacity_minutes: data.totalCapacityMinutes,
			allocated_minutes: 0
		})
		.returning({ id: drop.id });
	return newDrop.id;
}

export async function updateDrop(
	dropId: number,
	data: Partial<Pick<Drop, 'opens_at' | 'closes_at' | 'total_capacity_minutes'>>
): Promise<{ ok: true } | { ok: false; reason: 'NOT_FOUND' | 'NOT_DRAFT' }> {
	const [existing] = await db.select({ status: drop.status }).from(drop).where(eq(drop.id, dropId));
	if (!existing) return { ok: false, reason: 'NOT_FOUND' };
	if (existing.status !== 'DRAFT') return { ok: false, reason: 'NOT_DRAFT' };

	await db.update(drop).set(data).where(eq(drop.id, dropId));
	return { ok: true };
}

export async function publishDrop(
	dropId: number
): Promise<{ ok: true } | { ok: false; reason: 'NOT_FOUND' | 'NOT_DRAFT' }> {
	const [updated] = await db
		.update(drop)
		.set({ status: 'ACTIVE' })
		.where(and(eq(drop.id, dropId), eq(drop.status, 'DRAFT')))
		.returning({ id: drop.id });
	if (!updated) {
		const [existing] = await db.select({ id: drop.id }).from(drop).where(eq(drop.id, dropId));
		return { ok: false, reason: existing ? 'NOT_DRAFT' : 'NOT_FOUND' };
	}
	return { ok: true };
}

export async function closeDrop(
	dropId: number
): Promise<{ ok: true } | { ok: false; reason: 'NOT_FOUND' | 'NOT_ACTIVE' }> {
	const [updated] = await db
		.update(drop)
		.set({ status: 'CLOSED' })
		.where(and(eq(drop.id, dropId), eq(drop.status, 'ACTIVE')))
		.returning({ id: drop.id });
	if (!updated) {
		const [existing] = await db.select({ id: drop.id }).from(drop).where(eq(drop.id, dropId));
		return { ok: false, reason: existing ? 'NOT_ACTIVE' : 'NOT_FOUND' };
	}
	return { ok: true };
}

/** Replaces the full product list for a drop (only while DRAFT or ACTIVE) */
export async function setDropProducts(dropId: number, productIds: number[]): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.delete(dropProduct).where(eq(dropProduct.drop_id, dropId));
		if (productIds.length > 0) {
			await tx.insert(dropProduct).values(productIds.map((pid) => ({ drop_id: dropId, product_id: pid })));
		}
	});
}

/** Returns products assigned to a drop with their variants */
export async function getDropProductsAdmin(dropId: number): Promise<ProductWithVariants[]> {
	return getDropProducts(dropId);
}

/** Returns all active products (for the drop product picker) */
export async function getAllActiveProducts(): Promise<Product[]> {
	return await db.select().from(product).where(eq(product.is_active, true)).orderBy(product.name);
}

/**
 * When Admin closes a drop, advances all PAID orders in that drop to PRINTING.
 * Called after closeDrop() to unlock the Makers view.
 */
export async function advancePaidOrdersToPrinting(dropId: number): Promise<{ count: number }> {
	const updated = await db
		.update(order)
		.set({ status: 'PRINTING', updated_at: new Date() })
		.where(and(eq(order.drop_id, dropId), eq(order.status, 'PAID')))
		.returning({ id: order.id });
	return { count: updated.length };
}

/**
 * Confirms a payment: sets order to PAID, clears the soft lock expiry.
 * Called from the payment webhook. The allocated_minutes stay — lock becomes permanent.
 */
export async function confirmPayment(
	paymentGatewayId: string
): Promise<{ ok: true; orderId: string } | { ok: false; reason: 'ORDER_NOT_FOUND' }> {
	const [updated] = await db
		.update(order)
		.set({
			status: 'PAID',
			payment_gateway_id: paymentGatewayId,
			locked_until: null,
			updated_at: new Date()
		})
		.where(
			and(
				eq(order.payment_gateway_id, paymentGatewayId),
				eq(order.status, 'PENDING_PAYMENT')
			)
		)
		.returning({ id: order.id });

	if (!updated) return { ok: false, reason: 'ORDER_NOT_FOUND' };
	return { ok: true, orderId: updated.id };
}

// ─── Admin: Global Settings ───────────────────────────────────────────────────

export async function updateGlobalSettings(
	data: Partial<Pick<GlobalSettings, 'printer_is_on' | 'status_message'>>
): Promise<GlobalSettings> {
	const [updated] = await db
		.update(globalSettings)
		.set(data)
		.where(eq(globalSettings.id, 1))
		.returning();
	if (!updated) throw new Error('global_settings row not found — run seed');
	return updated;
}

// ─── Admin: Orders ────────────────────────────────────────────────────────────

export interface OrderFilters {
	status?: Order['status'];
	dropId?: number;
}

/** Returns orders (newest first) with optional status/drop filter */
export async function getOrdersWithFilters(filters: OrderFilters = {}): Promise<Order[]> {
	const conditions = [];
	if (filters.status) conditions.push(eq(order.status, filters.status));
	if (filters.dropId) conditions.push(eq(order.drop_id, filters.dropId));

	return await db
		.select()
		.from(order)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(sql`created_at DESC`);
}

/**
 * Marks an order as SHIPPED with a tracking number.
 * Only transitions from PACKED are allowed.
 */
export async function markOrderAsShipped(
	orderId: string,
	trackingNumber: string
): Promise<{ ok: true } | { ok: false; reason: 'ORDER_NOT_FOUND' | 'INVALID_STATUS' }> {
	const [updated] = await db
		.update(order)
		.set({ status: 'SHIPPED', tracking_number: trackingNumber, updated_at: new Date() })
		.where(and(eq(order.id, orderId), eq(order.status, 'PACKED')))
		.returning({ id: order.id });
	if (!updated) {
		const existing = await db.select({ id: order.id }).from(order).where(eq(order.id, orderId));
		return { ok: false, reason: existing.length ? 'INVALID_STATUS' : 'ORDER_NOT_FOUND' };
	}
	return { ok: true };
}

/**
 * Refunds an order: restores capacity to the drop, sets status to REFUNDED.
 * Only PAID / PRINTING / PACKED orders can be refunded.
 */
export async function refundOrder(
	orderId: string
): Promise<{ ok: true } | { ok: false; reason: 'ORDER_NOT_FOUND' | 'INVALID_STATUS' }> {
	const refundableStatuses: Order['status'][] = ['PAID', 'PRINTING', 'PACKED'];

	return await db.transaction(async (tx) => {
		const [existing] = await tx
			.select({ id: order.id, status: order.status, drop_id: order.drop_id, locked_minutes: order.locked_minutes })
			.from(order)
			.where(eq(order.id, orderId));

		if (!existing) return { ok: false, reason: 'ORDER_NOT_FOUND' };
		if (!refundableStatuses.includes(existing.status)) return { ok: false, reason: 'INVALID_STATUS' };

		// Restore capacity
		await tx
			.update(drop)
			.set({ allocated_minutes: sql`allocated_minutes - ${existing.locked_minutes}` })
			.where(eq(drop.id, existing.drop_id));

		// Mark refunded
		await tx
			.update(order)
			.set({ status: 'REFUNDED', updated_at: new Date() })
			.where(eq(order.id, orderId));

		return { ok: true };
	});
}

// ─── Admin: Dashboard Stats ────────────────────────────────────────────────────

export interface DashboardStats {
	totalOrders: number;
	pendingOrders: number;
	paidOrders: number;
	activeDropId: number | null;
	activeDropCapacityPct: number | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
	const [stats] = await db
		.select({
			totalOrders: sql<number>`count(*)::int`,
			pendingOrders: sql<number>`count(*) filter (where ${order.status} = 'PENDING_PAYMENT')::int`,
			paidOrders: sql<number>`count(*) filter (where ${order.status} = 'PAID')::int`
		})
		.from(order);

	const activeDrop = await getActiveDrop();
	const activeDropCapacityPct =
		activeDrop && activeDrop.total_capacity_minutes > 0
			? Math.round((activeDrop.allocated_minutes / activeDrop.total_capacity_minutes) * 100)
			: null;

	return {
		totalOrders: stats?.totalOrders ?? 0,
		pendingOrders: stats?.pendingOrders ?? 0,
		paidOrders: stats?.paidOrders ?? 0,
		activeDropId: activeDrop?.id ?? null,
		activeDropCapacityPct
	};
}

// ─── Makers: Print Batch & FIFO ───────────────────────────────────────────────

export interface PrintBatchGroup {
	variantId: number;
	filamentColor: string;
	hexCode: string;
	productName: string;
	/** Total units to print across all PRINTING orders */
	totalUnits: number;
	/** Units already marked PRINTED */
	printedUnits: number;
}

/**
 * Returns the print batch for the most recent CLOSED drop.
 * Groups order items by variant: total units needed + printed so far.
 */
export async function getPrintBatch(): Promise<{ dropId: number | null; items: PrintBatchGroup[] }> {
	// Find the most recent CLOSED drop
	const [closedDrop] = await db
		.select({ id: drop.id })
		.from(drop)
		.where(eq(drop.status, 'CLOSED'))
		.orderBy(sql`closes_at DESC`)
		.limit(1);

	if (!closedDrop) return { dropId: null, items: [] };

	const rows = await db
		.select({
			variantId: productVariant.id,
			filamentColor: productVariant.filament_color,
			hexCode: productVariant.hex_code,
			productName: product.name,
			itemStatus: orderItem.status,
			quantity: orderItem.quantity
		})
		.from(orderItem)
		.innerJoin(order, eq(orderItem.order_id, order.id))
		.innerJoin(productVariant, eq(orderItem.variant_id, productVariant.id))
		.innerJoin(product, eq(productVariant.product_id, product.id))
		.where(and(eq(order.drop_id, closedDrop.id), eq(order.status, 'PRINTING')));

	const groups = new Map<number, PrintBatchGroup>();
	for (const row of rows) {
		if (!groups.has(row.variantId)) {
			groups.set(row.variantId, {
				variantId: row.variantId,
				filamentColor: row.filamentColor,
				hexCode: row.hexCode,
				productName: row.productName,
				totalUnits: 0,
				printedUnits: 0
			});
		}
		const g = groups.get(row.variantId)!;
		g.totalUnits += row.quantity;
		if (row.itemStatus === 'PRINTED') g.printedUnits += row.quantity;
	}

	return { dropId: closedDrop.id, items: [...groups.values()] };
}

/**
 * FIFO [+1]: marks one unit of a variant as PRINTED in the oldest eligible PRINTING order.
 * If all items in that order are then PRINTED, advances the order to PACKED.
 */
export async function markNextPrinted(
	variantId: number
): Promise<{ ok: true; orderPacked: boolean } | { ok: false; reason: 'NOTHING_TO_PRINT' }> {
	return await db.transaction(async (tx) => {
		// Find the oldest PRINTING order that has a PENDING item for this variant
		const [target] = await tx
			.select({ itemId: orderItem.id, orderId: orderItem.order_id })
			.from(orderItem)
			.innerJoin(order, eq(orderItem.order_id, order.id))
			.where(
				and(
					eq(orderItem.variant_id, variantId),
					eq(orderItem.status, 'PENDING'),
					eq(order.status, 'PRINTING')
				)
			)
			.orderBy(order.created_at)
			.limit(1);

		if (!target) return { ok: false, reason: 'NOTHING_TO_PRINT' };

		const now = new Date();

		// Mark item PRINTED
		await tx
			.update(orderItem)
			.set({ status: 'PRINTED', printed_at: now })
			.where(eq(orderItem.id, target.itemId));

		// Check if all items in this order are now PRINTED
		const remaining = await tx
			.select({ status: orderItem.status })
			.from(orderItem)
			.where(eq(orderItem.order_id, target.orderId));

		const allPrinted = remaining.every((r) => r.status === 'PRINTED');

		if (allPrinted) {
			await tx
				.update(order)
				.set({ status: 'PACKED', updated_at: now })
				.where(eq(order.id, target.orderId));
		}

		return { ok: true, orderPacked: allPrinted };
	});
}

/**
 * FIFO [-1]: undoes the last PRINTED mark for a variant within the undo window.
 */
export async function undoLastPrinted(
	variantId: number
): Promise<{ ok: true } | { ok: false; reason: 'NOTHING_TO_UNDO' | 'UNDO_WINDOW_EXPIRED' }> {
	return await db.transaction(async (tx) => {
		// Find the most recently printed item for this variant in PRINTING orders
		const [target] = await tx
			.select({ itemId: orderItem.id, orderId: orderItem.order_id, printedAt: orderItem.printed_at })
			.from(orderItem)
			.innerJoin(order, eq(orderItem.order_id, order.id))
			.where(
				and(
					eq(orderItem.variant_id, variantId),
					eq(orderItem.status, 'PRINTED'),
					// Also allow undo on PACKED orders (undo advances it back to PRINTING)
				)
			)
			.orderBy(sql`${orderItem.printed_at} DESC NULLS LAST`)
			.limit(1);

		if (!target || !target.printedAt) return { ok: false, reason: 'NOTHING_TO_UNDO' };

		const { isWithinUndoWindow } = await import('../fifo');
		if (!isWithinUndoWindow(target.printedAt, new Date())) {
			return { ok: false, reason: 'UNDO_WINDOW_EXPIRED' };
		}

		// Revert item to PENDING
		await tx
			.update(orderItem)
			.set({ status: 'PENDING', printed_at: null })
			.where(eq(orderItem.id, target.itemId));

		// If the order was PACKED, revert it to PRINTING
		const [orderRow] = await tx.select({ status: order.status }).from(order).where(eq(order.id, target.orderId));
		if (orderRow?.status === 'PACKED') {
			await tx.update(order).set({ status: 'PRINTING', updated_at: new Date() }).where(eq(order.id, target.orderId));
		}

		return { ok: true };
	});
}

/**
 * Releases all expired soft locks (BLIK timeout).
 * Returns allocated_minutes back to the drop and marks orders CANCELLED.
 * Called by the Vercel Cron job every minute.
 */
export async function releaseExpiredSoftLocks(): Promise<{ released: number }> {
	const now = new Date();

	const expired = await db
		.select({ id: order.id, drop_id: order.drop_id, locked_minutes: order.locked_minutes })
		.from(order)
		.where(
			and(
				eq(order.status, 'PENDING_PAYMENT'),
				isNotNull(order.locked_until),
				lt(order.locked_until, now)
			)
		);

	if (expired.length === 0) return { released: 0 };

	await db.transaction(async (tx) => {
		for (const exp of expired) {
			// Restore capacity to drop
			await tx
				.update(drop)
				.set({ allocated_minutes: sql`allocated_minutes - ${exp.locked_minutes}` })
				.where(eq(drop.id, exp.drop_id));

			// Cancel order
			await tx
				.update(order)
				.set({ status: 'CANCELLED', locked_until: null, updated_at: now })
				.where(eq(order.id, exp.id));
		}
	});

	return { released: expired.length };
}
