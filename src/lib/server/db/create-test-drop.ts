/**
 * Create a test drop for development
 * Run with: pnpm tsx src/lib/server/db/create-test-drop.ts
 */

import 'dotenv/config';
import { db } from './index';
import { drop, dropProduct, product } from './schema';

async function createTestDrop() {
	console.log('🎯 Creating test drop...\n');

	try {
		// Get all products
		const products = await db.select().from(product);
		
		if (products.length === 0) {
			console.log('❌ No products found. Run pnpm db:seed first.');
			process.exit(1);
		}

		// Create a drop that's active for the next 7 days
		const now = new Date();
		const opensAt = new Date(now);
		opensAt.setHours(0, 0, 0, 0); // Start of today
		
		const closesAt = new Date(opensAt);
		closesAt.setDate(closesAt.getDate() + 7); // 7 days from now
		closesAt.setHours(23, 59, 59, 999); // End of that day

		// Calculate total capacity: 10 hours per day * 7 days = 70 hours = 4200 minutes
		const totalCapacityMinutes = 10 * 60 * 7; // 4200 minutes

		console.log(`📅 Drop period: ${opensAt.toISOString()} to ${closesAt.toISOString()}`);
		console.log(`⏱️  Total capacity: ${totalCapacityMinutes} minutes (${totalCapacityMinutes / 60} hours)\n`);

		// Create the drop
		const [newDrop] = await db
			.insert(drop)
			.values({
				status: 'ACTIVE',
				opens_at: opensAt,
				closes_at: closesAt,
				total_capacity_minutes: totalCapacityMinutes,
				allocated_minutes: 0
			})
			.returning();

		console.log(`✅ Created drop with ID: ${newDrop.id}`);
		console.log(`   Status: ${newDrop.status}`);
		console.log(`   Capacity: ${newDrop.total_capacity_minutes} minutes\n`);

		// Link all products to this drop
		console.log('🔗 Linking products to drop...');
		for (const prod of products) {
			await db.insert(dropProduct).values({
				drop_id: newDrop.id,
				product_id: prod.id
			});
			console.log(`   ✅ Linked: ${prod.name}`);
		}

		console.log('\n✨ Test drop created successfully!');
		console.log(`\n🌐 Visit http://localhost:5173 to see your shop!\n`);
		
		process.exit(0);
	} catch (error) {
		console.error('❌ Failed to create test drop:', error);
		process.exit(1);
	}
}

createTestDrop();

