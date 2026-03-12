# 🗄️ Database Setup & Management

## Overview

This project uses **Neon PostgreSQL** (serverless PostgreSQL) with **Drizzle ORM** for type-safe database operations.

## 📋 Quick Start

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

Your Neon connection string should look like:
```
postgresql://neondb_owner:xxx@ep-xxx.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 2. Initialize Database

```bash
# Push schema to database (creates all tables)
pnpm db:push

# Seed with initial data (products, variants, settings)
pnpm db:seed

# Add performance indexes
pnpm db:add-indexes
```

## 🛠️ Available Commands

| Command | Description |
|---------|-------------|
| `pnpm db:push` | Push schema changes to database (development) |
| `pnpm db:generate` | Generate migration files (production) |
| `pnpm db:migrate` | Apply migrations to database |
| `pnpm db:studio` | Open Drizzle Studio (visual database browser) |
| `pnpm db:seed` | Populate database with initial data |
| `pnpm db:add-indexes` | Create performance indexes |

## 📊 Database Schema

### Tables

1. **`global_settings`** - Singleton configuration (printer status, active hours, capacity settings)
2. **`product`** - Product catalog (fidget toys)
3. **`product_variant`** - Color/filament variants for each product
4. **`drop`** - Weekly production windows with capacity tracking
5. **`drop_product`** - Junction table (which products are in which drop)
6. **`order`** - Customer orders with soft-lock mechanism
7. **`order_item`** - Line items within orders

### Key Features

- **Capacity Management**: Tracks production capacity in minutes (not item slots)
- **Soft-Lock Pattern**: Reserves capacity during payment flow (15-minute timeout)
- **Money Handling**: Prices stored in grosze (Polish cents) as integers
- **UUID Public IDs**: Orders use UUIDs for security
- **Timezone-Aware**: All timestamps use `timestamptz`

## 🔍 Drizzle Studio

Visual database browser at `https://local.drizzle.studio`

```bash
pnpm db:studio
```

Features:
- Browse all tables and data
- Edit records directly
- Run SQL queries
- View relationships

## 🎨 Seed Data

The seed script creates:

### Global Settings
- Printer status: ON
- Active hours: 8:00 - 18:00
- Buffer time: 30 minutes
- Mystery box duration: 120 minutes

### Products (4 items)
1. **Infinity Cube** - 45 min, 25.00 PLN
   - Ocean Blue, Sunset Orange, Forest Green
2. **Flexi Rex** - 90 min, 35.00 PLN
   - Dino Green, Lava Red, Galaxy Purple
3. **Spiral Spinner** - 60 min, 28.00 PLN
   - Neon Pink, Electric Blue, Lime Green
4. **Mystery Box** - 120 min, 20.00 PLN
   - Mystery variant (random color)

## 🚀 Performance Indexes

The following indexes are created for optimal query performance:

### Order Indexes
- `idx_order_status_locked` - Partial index for pending orders (cron job)
- `idx_order_drop_id` - Orders by drop
- `idx_order_customer_email` - Customer lookup
- `idx_order_status` - Status filtering

### Order Item Indexes
- `idx_order_item_order_id` - Items by order (most common)
- `idx_order_item_variant_id` - Product analytics
- `idx_order_item_status` - Makers' workflow (pending items)

### Drop Indexes
- `idx_drop_status` - Active drops
- `idx_drop_dates` - Date range queries

### Product Indexes
- `idx_product_variant_product_id` - Variants by product
- `idx_product_variant_active` - Active variants only
- `idx_product_active` - Active products only

## 🔄 Migration Workflow

### Development (Schema Push)
```bash
# Make changes to src/lib/server/db/schema.ts
pnpm db:push
```

### Production (Migrations)
```bash
# Generate migration files
pnpm db:generate

# Review generated SQL in drizzle/ folder

# Apply to production
pnpm db:migrate
```

## 🔐 Security Best Practices

✅ **Implemented:**
- SSL required for all connections
- Channel binding enabled
- UUIDs for public-facing IDs
- Environment variables for credentials
- Connection pooling via Neon

## 📈 Monitoring & Maintenance

### Query Performance
```sql
-- Update query planner statistics
ANALYZE;

-- View slow queries (if enabled)
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;
```

### Backup Strategy
- Neon provides automatic daily backups
- Point-in-time recovery available
- Manual backups via Neon dashboard

## 🐛 Troubleshooting

### Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

### Schema Drift
```bash
# Pull current schema from database
pnpm db:pull

# Compare with local schema
pnpm db:check
```

### Reset Database (⚠️ Destructive)
```bash
# Drop all tables and recreate
pnpm db:push --force

# Re-seed data
pnpm db:seed
pnpm db:add-indexes
```

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Neon Documentation](https://neon.tech/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

