/**
 * Database seed script
 * Populates the database with initial data for development and testing
 *
 * Run with: pnpm db:seed
 */

import 'dotenv/config';
import { db } from './index';
import {
	globalSettings,
	product,
	productVariant,
	drop,
	dropProduct
} from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
	console.log('🌱 Starting database seed...\n');

	try {
		// ─── 1. Global Settings ───────────────────────────────────────────────────
		console.log('📋 Seeding global settings...');
		
		const existingSettings = await db
			.select()
			.from(globalSettings)
			.where(eq(globalSettings.id, 1));

		if (existingSettings.length === 0) {
			await db.insert(globalSettings).values({
				id: 1,
				printer_is_on: true,
				status_message: 'Welcome to Fidget Fun! Weekly drops every Monday.',
				active_window_start_hour: 8,
				active_window_end_hour: 18,
				turnaround_buffer_minutes: 30,
				mystery_box_minutes: 120
			});
			console.log('✅ Global settings created');
		} else {
			console.log('⏭️  Global settings already exist');
		}

		// ─── 2. Products ──────────────────────────────────────────────────────────
		console.log('\n🎨 Seeding products...');

		const products = [
			{
				name: 'Infinity Cube',
				description: 'Classic fidget cube that folds infinitely. Perfect for desk fidgeting!',
				print_duration_minutes: 45,
				price_pln: 2500, // 25.00 PLN
				inpost_gabaryt: 'A' as const,
				is_active: true
			},
			{
				name: 'Flexi Rex',
				description: 'Articulated T-Rex that moves and poses. Kids love it!',
				print_duration_minutes: 90,
				price_pln: 3500, // 35.00 PLN
				inpost_gabaryt: 'B' as const,
				is_active: true
			},
			{
				name: 'Spiral Spinner',
				description: 'Mesmerizing spiral fidget spinner with smooth bearings.',
				print_duration_minutes: 60,
				price_pln: 2800, // 28.00 PLN
				inpost_gabaryt: 'A' as const,
				is_active: true
			},
			{
				name: 'Mystery Box',
				description: 'Surprise fidget toy! You choose the size, we choose the design and color.',
				print_duration_minutes: 120, // This will be overridden by mystery_box_minutes
				price_pln: 2000, // 20.00 PLN
				inpost_gabaryt: 'A' as const,
				is_active: true
			}
		];

		const insertedProducts = [];
		for (const prod of products) {
			const existing = await db
				.select()
				.from(product)
				.where(eq(product.name, prod.name));

			if (existing.length === 0) {
				const [inserted] = await db.insert(product).values(prod).returning();
				insertedProducts.push(inserted);
				console.log(`✅ Created product: ${prod.name}`);
			} else {
				insertedProducts.push(existing[0]);
				console.log(`⏭️  Product already exists: ${prod.name}`);
			}
		}

		// ─── 3. Product Variants ──────────────────────────────────────────────────
		console.log('\n🎨 Seeding product variants...');

		const variants = [
			// Infinity Cube variants
			{ product_name: 'Infinity Cube', filament_color: 'Ocean Blue', hex_code: '#0077BE', is_mystery: false },
			{ product_name: 'Infinity Cube', filament_color: 'Sunset Orange', hex_code: '#FF6B35', is_mystery: false },
			{ product_name: 'Infinity Cube', filament_color: 'Forest Green', hex_code: '#2D5016', is_mystery: false },
			
			// Flexi Rex variants
			{ product_name: 'Flexi Rex', filament_color: 'Dino Green', hex_code: '#4A7C59', is_mystery: false },
			{ product_name: 'Flexi Rex', filament_color: 'Lava Red', hex_code: '#C1121F', is_mystery: false },
			{ product_name: 'Flexi Rex', filament_color: 'Galaxy Purple', hex_code: '#5A189A', is_mystery: false },
			
			// Spiral Spinner variants
			{ product_name: 'Spiral Spinner', filament_color: 'Neon Pink', hex_code: '#FF006E', is_mystery: false },
			{ product_name: 'Spiral Spinner', filament_color: 'Electric Blue', hex_code: '#00B4D8', is_mystery: false },
			{ product_name: 'Spiral Spinner', filament_color: 'Lime Green', hex_code: '#90E0EF', is_mystery: false },
			
			// Mystery Box variant (special)
			{ product_name: 'Mystery Box', filament_color: 'Mystery', hex_code: '#000000', is_mystery: true }
		];

		for (const variant of variants) {
			const prod = insertedProducts.find(p => p.name === variant.product_name);
			if (!prod) continue;

			const existing = await db
				.select()
				.from(productVariant)
				.where(eq(productVariant.filament_color, variant.filament_color));

			if (existing.length === 0) {
				await db.insert(productVariant).values({
					product_id: prod.id,
					filament_color: variant.filament_color,
					hex_code: variant.hex_code,
					is_mystery: variant.is_mystery,
					is_active: true
				});
				console.log(`✅ Created variant: ${variant.product_name} - ${variant.filament_color}`);
			} else {
				console.log(`⏭️  Variant already exists: ${variant.filament_color}`);
			}
		}

		console.log('\n✨ Database seed completed successfully!\n');
		process.exit(0);
	} catch (error) {
		console.error('❌ Seed failed:', error);
		process.exit(1);
	}
}

seed();

