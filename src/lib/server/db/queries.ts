/**
 * All database interactions for the application.
 * Route files import from here — keeps server routes lean.
 */
import { and, eq, lt, lte, gte, sql } from 'drizzle-orm';
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
		.where(and(eq(order.status, 'PENDING_PAYMENT'), lt(order.locked_until, now)));

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
