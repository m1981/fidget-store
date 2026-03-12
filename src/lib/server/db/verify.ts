/**
 * Database verification script
 * Tests connection and validates schema integrity
 * 
 * Run with: pnpm db:verify
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
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

async function verify() {
	console.log('🔍 Verifying database connection and schema...\n');

	try {
		// ─── 1. Test Connection ───────────────────────────────────────────────────
		console.log('📡 Testing database connection...');
		const result = await db.execute(sql`SELECT version()`);
		console.log('✅ Connected to PostgreSQL');
		if (result && result.length > 0) {
			const version = (result[0] as any).version;
			console.log(`   Version: ${version.split(' ').slice(0, 2).join(' ')}\n`);
		} else {
			console.log('   Version: Unknown\n');
		}

		// ─── 2. Verify Tables Exist ───────────────────────────────────────────────
		console.log('📋 Verifying tables...');
		const tables = await db.execute(sql`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
			ORDER BY table_name
		`);

		const expectedTables = [
			'global_settings',
			'product',
			'product_variant',
			'drop',
			'drop_product',
			'order',
			'order_item'
		];

		const existingTables = (tables as any[]).map((r: any) => r.table_name);
		
		for (const table of expectedTables) {
			if (existingTables.includes(table)) {
				console.log(`✅ Table exists: ${table}`);
			} else {
				console.log(`❌ Table missing: ${table}`);
			}
		}

		// ─── 3. Verify Enums ──────────────────────────────────────────────────────
		console.log('\n🎨 Verifying enums...');
		const enums = await db.execute(sql`
			SELECT typname
			FROM pg_type
			WHERE typtype = 'e'
			ORDER BY typname
		`);

		const expectedEnums = [
			'drop_status',
			'order_status',
			'order_item_status',
			'inpost_gabaryt'
		];

		const existingEnums = (enums as any[]).map((r: any) => r.typname);
		
		for (const enumType of expectedEnums) {
			if (existingEnums.includes(enumType)) {
				console.log(`✅ Enum exists: ${enumType}`);
			} else {
				console.log(`❌ Enum missing: ${enumType}`);
			}
		}

		// ─── 4. Verify Indexes ────────────────────────────────────────────────────
		console.log('\n🔍 Verifying indexes...');
		const indexes = await db.execute(sql`
			SELECT indexname
			FROM pg_indexes
			WHERE schemaname = 'public'
			AND indexname LIKE 'idx_%'
			ORDER BY indexname
		`);

		const indexCount = (indexes as any[]).length;
		console.log(`✅ Found ${indexCount} custom indexes`);

		if (indexCount > 0) {
			(indexes as any[]).forEach((r: any) => {
				console.log(`   - ${r.indexname}`);
			});
		}

		// ─── 5. Count Records ─────────────────────────────────────────────────────
		console.log('\n📊 Counting records...');

		const settingsCount = await db.select().from(globalSettings);
		console.log(`✅ Global settings: ${settingsCount.length} row(s)`);

		const productsCount = await db.select().from(product);
		console.log(`✅ Products: ${productsCount.length} row(s)`);

		const variantsCount = await db.select().from(productVariant);
		console.log(`✅ Product variants: ${variantsCount.length} row(s)`);

		const dropsCount = await db.select().from(drop);
		console.log(`✅ Drops: ${dropsCount.length} row(s)`);

		const ordersCount = await db.select().from(order);
		console.log(`✅ Orders: ${ordersCount.length} row(s)`);

		const orderItemsCount = await db.select().from(orderItem);
		console.log(`✅ Order items: ${orderItemsCount.length} row(s)`);

		// ─── 6. Test Query Performance ────────────────────────────────────────────
		console.log('\n⚡ Testing query performance...');
		
		const start = Date.now();
		await db.select().from(product);
		const duration = Date.now() - start;
		
		console.log(`✅ Simple SELECT query: ${duration}ms`);

		// ─── 7. Verify Foreign Keys ───────────────────────────────────────────────
		console.log('\n🔗 Verifying foreign key constraints...');
		const fks = await db.execute(sql`
			SELECT
				tc.table_name,
				kcu.column_name,
				ccu.table_name AS foreign_table_name
			FROM information_schema.table_constraints AS tc
			JOIN information_schema.key_column_usage AS kcu
				ON tc.constraint_name = kcu.constraint_name
			JOIN information_schema.constraint_column_usage AS ccu
				ON ccu.constraint_name = tc.constraint_name
			WHERE tc.constraint_type = 'FOREIGN KEY'
			AND tc.table_schema = 'public'
			ORDER BY tc.table_name
		`);

		console.log(`✅ Found ${(fks as any[]).length} foreign key constraints`);

		// ─── Summary ──────────────────────────────────────────────────────────────
		console.log('\n' + '='.repeat(60));
		console.log('✨ Database verification complete!');
		console.log('='.repeat(60));
		console.log(`📊 Tables: ${existingTables.length}`);
		console.log(`🎨 Enums: ${existingEnums.length}`);
		console.log(`🔍 Indexes: ${indexCount}`);
		console.log(`📦 Total records: ${settingsCount.length + productsCount.length + variantsCount.length + dropsCount.length + ordersCount.length + orderItemsCount.length}`);
		console.log('='.repeat(60) + '\n');

		process.exit(0);
	} catch (error) {
		console.error('\n❌ Verification failed:', error);
		process.exit(1);
	}
}

verify();

