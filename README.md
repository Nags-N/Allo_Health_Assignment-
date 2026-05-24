# Allo Inventory Management System

A real-time, concurrency-safe, multi-warehouse inventory reservation and fulfillment system built with Next.js, Prisma, PostgreSQL, and Upstash Redis.

---

## Technical Features

### 1. Concurrency Control & Race Condition Prevention
To guarantee that two shoppers cannot reserve the same unit simultaneously, we use a single raw SQL update query at the database level:
```sql
UPDATE "StockLevel"
SET "reservedUnits" = "reservedUnits" + $quantity,
    "updatedAt" = NOW()
WHERE "productId" = $productId
  AND "warehouseId" = $warehouseId
  AND ("totalUnits" - "reservedUnits") >= $quantity
```
Because the update is atomic, the database's default transaction isolation locks the row and decrements available units only if the condition `(totalUnits - reservedUnits) >= quantity` holds true. If two requests execute this simultaneously for the last unit, exactly one will update a row (`updateCount === 1`) and succeed, while the other will return `0` modified rows and fail with a `409 Conflict`.

### 2. Idempotency Support (Bonus)
Both the reserve and confirm endpoints support idempotency to prevent duplicate charges or double holds under unstable network conditions:
* Clients send requests with an `Idempotency-Key` UUID header.
* Upstash Redis caches the status and response payload for 24 hours.
* If a retried request hits the server with the same key, the server returns the cached response directly without executing side effects.

### 3. Hold Expiry Mechanism
To prevent abandoned checkouts from permanently locking inventory, holds expire after 10 minutes using a three-layered approach:
1. **Lazy Cleanup (On Read)**: Whenever a user loads `/api/products`, the server executes a fast Common Table Expression (CTE) query to find and release expired pending reservations and free up `reservedUnits` in the background.
2. **Pre-Confirm Validation (On Write)**: The `/api/reservations/:id/confirm` transaction checks the reservation's expiry timestamp. If it has passed, the confirmation is blocked, the reservation transitions to `EXPIRED`, units are released, and a `410 Gone` error is returned.
3. **Active Cron Cleaner**: A secure background worker endpoint (`GET /api/cron/expire`) can be scheduled (e.g., via Vercel Cron or GitHub Actions) to run periodically and cleanup stale reservations.

---

## Getting Started

### Prerequisites
* Node.js v18+
* A hosted PostgreSQL instance (neon.tech, Supabase, or Railway)
* An Upstash Redis REST URL & token

### 1. Environment Configuration
Create a `.env` file in the root directory with the following variables:

```env
# PostgreSQL connection strings
DATABASE_URL="postgresql://username:password@hostname:5432/db_name?sslmode=require"
DIRECT_URL="postgresql://username:password@hostname:5432/db_name?sslmode=require"

# Upstash Redis details (For Idempotency & Locking)
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_token_here"

# Expiry Cron Secret (Authorization Header: Bearer <secret>)
CRON_SECRET="your-cron-secret-here"
```

### 2. Install Dependencies
Run from the root directory:
```bash
npm install
```

### 3. Run Database Migrations
Deploy the database schema:
```bash
npx prisma db push
```

### 4. Seed database
Seed the database with regional warehouses, sample products, and stock levels:
```bash
npx prisma db seed
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application catalog and test the reservation flow!

---

## Trade-offs & Future Enhancements
* **In-Memory Locking**: Currently, PostgreSQL row-level locks handle stock updates. At massive global scale, implementing a distributed Redis lock (e.g., Redlock) before hitting Postgres would further shield the database from heavy concurrent writes.
* **Image Assets**: For ease of use in a demonstration environment, catalog images are sourced from Unsplash. In production, these should be served via an optimized CDN or Next.js `<Image>` component with proper domains configured.
