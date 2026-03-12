/**
 * Add database indexes for performance optimization
 * 
 * Run with: pnpm db:add-indexes
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './index';

async function addIndexes() {
	console.log('🔧 Adding database indexes for performance...\n');

	try {
		// ─── Order Indexes ────────────────────────────────────────────────────────
		console.log('📊 Creating order indexes...');
		
		// Index for finding orders by status and locked_until (used by cron job)
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_order_status_locked 
			ON "order"(status, locked_until) 
			WHERE status = 'PENDING_PAYMENT' AND locked_until IS NOT NULL
		`);
		console.log('✅ Created: idx_order_status_locked (partial index for pending orders)');

		// Index for finding orders by drop_id (used in admin views)
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_order_drop_id 
			ON "order"(drop_id)
		`);
		console.log('✅ Created: idx_order_drop_id');

		// Index for finding orders by customer email (customer lookup)
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_order_customer_email 
			ON "order"(customer_email)
		`);
		console.log('✅ Created: idx_order_customer_email');

		// Index for finding orders by status (admin filtering)
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_order_status 
			ON "order"(status)
		`);
		console.log('✅ Created: idx_order_status');

		// ─── Order Item Indexes ───────────────────────────────────────────────────
		console.log('\n📊 Creating order_item indexes...');

		// Index for finding items by order_id (most common query)
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_order_item_order_id 
			ON order_item(order_id)
		`);
		console.log('✅ Created: idx_order_item_order_id');

		// Index for finding items by variant_id (product analytics)
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_order_item_variant_id 
			ON order_item(variant_id)
		`);
		console.log('✅ Created: idx_order_item_variant_id');

		// Index for makers' workflow (PENDING items to print)
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_order_item_status 
			ON order_item(status) 
			WHERE status = 'PENDING'
		`);
		console.log('✅ Created: idx_order_item_status (partial index for pending items)');

		// ─── Drop Indexes ─────────────────────────────────────────────────────────
		console.log('\n📊 Creating drop indexes...');

		// Index for finding active drops
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_drop_status 
			ON drop(status)
		`);
		console.log('✅ Created: idx_drop_status');

		// Index for finding drops by date range
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_drop_dates 
			ON drop(opens_at, closes_at)
		`);
		console.log('✅ Created: idx_drop_dates');

		// ─── Drop Product Indexes ─────────────────────────────────────────────────
		console.log('\n📊 Creating drop_product indexes...');

		// Composite index for junction table lookups
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_drop_product_drop_id 
			ON drop_product(drop_id)
		`);
		console.log('✅ Created: idx_drop_product_drop_id');

		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_drop_product_product_id 
			ON drop_product(product_id)
		`);
		console.log('✅ Created: idx_drop_product_product_id');

		// ─── Product Variant Indexes ──────────────────────────────────────────────
		console.log('\n📊 Creating product_variant indexes...');

		// Index for finding variants by product
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_product_variant_product_id 
			ON product_variant(product_id)
		`);
		console.log('✅ Created: idx_product_variant_product_id');

		// Index for active variants only
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_product_variant_active 
			ON product_variant(product_id, is_active) 
			WHERE is_active = true
		`);
		console.log('✅ Created: idx_product_variant_active (partial index)');

		// ─── Product Indexes ──────────────────────────────────────────────────────
		console.log('\n📊 Creating product indexes...');

		// Index for active products
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS idx_product_active 
			ON product(is_active) 
			WHERE is_active = true
		`);
		console.log('✅ Created: idx_product_active (partial index)');

		console.log('\n✨ All indexes created successfully!\n');
		console.log('💡 Tip: Run ANALYZE to update query planner statistics:');
		console.log('   psql $DATABASE_URL -c "ANALYZE;"\n');
		
		process.exit(0);
	} catch (error) {
		console.error('❌ Index creation failed:', error);
		process.exit(1);
	}
}

addIndexes();

