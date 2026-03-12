/**
 * Integration tests for drop management queries.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	getAllDrops,
	createDrop,
	updateDrop,
	publishDrop,
	closeDrop,
	setDropProducts,
	getAllActiveProducts
} from './queries';
import { db } from './index';
import { drop, dropProduct, product, productVariant } from './schema';
import { eq } from 'drizzle-orm';
import { ensureGlobalSettings } from '$lib/test-helpers/db-setup';

const testDropIds: number[] = [];
const testProductIds: number[] = [];

beforeEach(async () => {
	await ensureGlobalSettings();
});

afterEach(async () => {
	// Cleanup in FK order
	for (const did of testDropIds) {
		await db.delete(dropProduct).where(eq(dropProduct.drop_id, did));
		await db.delete(drop).where(eq(drop.id, did));
	}
	for (const pid of testProductIds) {
		await db.delete(productVariant).where(eq(productVariant.product_id, pid));
		await db.delete(product).where(eq(product.id, pid));
	}
	testDropIds.length = 0;
	testProductIds.length = 0;
});

async function makeTestDrop(overrides: Partial<Parameters<typeof db.insert>[0]> = {}) {
	const now = new Date();
	const id = await createDrop({
		opensAt: now,
		closesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
		totalCapacityMinutes: 600
	});
	testDropIds.push(id);
	return id;
}

async function makeTestProduct(name = 'Test Product') {
	const [p] = await db.insert(product).values({
		name,
		description: '',
		print_duration_minutes: 60,
		price_pln: 1990,
		inpost_gabaryt: 'A',
		is_active: true
	}).returning({ id: product.id });
	testProductIds.push(p.id);
	return p.id;
}

// ─── createDrop ───────────────────────────────────────────────────────────────

describe('createDrop', () => {
	it('creates a DRAFT drop with correct fields', async () => {
		const id = await makeTestDrop();
		const [row] = await db.select().from(drop).where(eq(drop.id, id));
		expect(row.status).toBe('DRAFT');
		expect(row.total_capacity_minutes).toBe(600);
		expect(row.allocated_minutes).toBe(0);
	});
});

// ─── updateDrop ───────────────────────────────────────────────────────────────

describe('updateDrop', () => {
	it('updates capacity on DRAFT drop', async () => {
		const id = await makeTestDrop();
		const result = await updateDrop(id, { total_capacity_minutes: 800 });
		expect(result.ok).toBe(true);
		const [row] = await db.select().from(drop).where(eq(drop.id, id));
		expect(row.total_capacity_minutes).toBe(800);
	});

	it('rejects update on non-DRAFT drop', async () => {
		const id = await makeTestDrop();
		await publishDrop(id);
		const result = await updateDrop(id, { total_capacity_minutes: 800 });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('NOT_DRAFT');
	});

	it('returns NOT_FOUND for unknown drop', async () => {
		const result = await updateDrop(999999, { total_capacity_minutes: 100 });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('NOT_FOUND');
	});
});

// ─── publishDrop ─────────────────────────────────────────────────────────────

describe('publishDrop', () => {
	it('transitions DRAFT → ACTIVE', async () => {
		const id = await makeTestDrop();
		const result = await publishDrop(id);
		expect(result.ok).toBe(true);
		const [row] = await db.select().from(drop).where(eq(drop.id, id));
		expect(row.status).toBe('ACTIVE');
	});

	it('returns NOT_DRAFT if drop is already ACTIVE', async () => {
		const id = await makeTestDrop();
		await publishDrop(id);
		const result = await publishDrop(id);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('NOT_DRAFT');
	});

	it('returns NOT_FOUND for unknown drop', async () => {
		const result = await publishDrop(999999);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('NOT_FOUND');
	});
});

// ─── closeDrop ────────────────────────────────────────────────────────────────

describe('closeDrop', () => {
	it('transitions ACTIVE → CLOSED', async () => {
		const id = await makeTestDrop();
		await publishDrop(id);
		const result = await closeDrop(id);
		expect(result.ok).toBe(true);
		const [row] = await db.select().from(drop).where(eq(drop.id, id));
		expect(row.status).toBe('CLOSED');
	});

	it('returns NOT_ACTIVE for DRAFT drop', async () => {
		const id = await makeTestDrop();
		const result = await closeDrop(id);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('NOT_ACTIVE');
	});

	it('returns NOT_FOUND for unknown drop', async () => {
		const result = await closeDrop(999999);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).toBe('NOT_FOUND');
	});
});

// ─── setDropProducts ──────────────────────────────────────────────────────────

describe('setDropProducts', () => {
	it('assigns products to a drop', async () => {
		const dropId = await makeTestDrop();
		const pid1 = await makeTestProduct('Product A');
		const pid2 = await makeTestProduct('Product B');

		await setDropProducts(dropId, [pid1, pid2]);
		const links = await db.select().from(dropProduct).where(eq(dropProduct.drop_id, dropId));
		expect(links.map((l) => l.product_id).sort()).toEqual([pid1, pid2].sort());
	});

	it('replaces existing product list', async () => {
		const dropId = await makeTestDrop();
		const pid1 = await makeTestProduct('Product X');
		const pid2 = await makeTestProduct('Product Y');

		await setDropProducts(dropId, [pid1]);
		await setDropProducts(dropId, [pid2]);

		const links = await db.select().from(dropProduct).where(eq(dropProduct.drop_id, dropId));
		expect(links.map((l) => l.product_id)).toEqual([pid2]);
	});

	it('removes all products when given empty list', async () => {
		const dropId = await makeTestDrop();
		const pid = await makeTestProduct('Product Z');

		await setDropProducts(dropId, [pid]);
		await setDropProducts(dropId, []);

		const links = await db.select().from(dropProduct).where(eq(dropProduct.drop_id, dropId));
		expect(links.length).toBe(0);
	});
});

// ─── getAllDrops ───────────────────────────────────────────────────────────────

describe('getAllDrops', () => {
	it('returns drops newest-first', async () => {
		const id1 = await makeTestDrop();
		const id2 = await makeTestDrop();
		const drops = await getAllDrops();
		const ids = drops.map((d) => d.id);
		expect(ids.indexOf(id2)).toBeLessThan(ids.indexOf(id1));
	});
});
