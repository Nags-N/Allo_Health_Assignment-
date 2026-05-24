# Allo Inventory Management System

A real-time, concurrency-safe, multi-warehouse inventory reservation and fulfillment system built with Next.js, Prisma, PostgreSQL, and Upstash Redis.

* **Live Deployment URL**: [https://allohealth-eta.vercel.app/](https://allohealth-eta.vercel.app/)
* **GitHub Repository**: [https://github.com/Nags-N/Allo_Health_Assignment-](https://github.com/Nags-N/Allo_Health_Assignment-)

---

## How I Handled the Core Requirements

### 1. Concurrency Control & Race Condition Prevention
To prevent two shoppers from placing a hold on the exact same unit at the same time, I wrote a single atomic SQL update query executed at the database level:
```sql
UPDATE "StockLevel"
SET "reservedUnits" = "reservedUnits" + $quantity,
    "updatedAt" = NOW()
WHERE "productId" = $productId
  AND "warehouseId" = $warehouseId
  AND ("totalUnits" - "reservedUnits") >= $quantity
```
By performing this check and update in a single atomic database statement, we let the database handle the row-level lock. If two concurrent requests try to reserve the last remaining unit, exactly one query will modify a row (`updateCount === 1`) and succeed, while the other will modify `0` rows and return a `409 Conflict`.

### 2. Idempotency Support (Bonus)
I implemented idempotency for the reserve and confirm endpoints to protect against duplicate checkout submissions or double reservations in case of flaky network retries:
* Clients send requests with an `Idempotency-Key` UUID header.
* I used Upstash Redis to cache the status and response payload for 24 hours.
* If a retried request hits the server with the same key, it immediately returns the cached response from Redis without running the database side effects again.

### 3. Stale Hold Expiry
To prevent abandoned checkouts from permanently locking up stock, I built a 10-minute hold expiry system that cleans up stale reservations in three ways:
1. **Lazy Cleanup (On Read)**: Whenever a user loads `/api/products`, the server runs a fast Common Table Expression (CTE) query to find and release expired pending reservations and free up `reservedUnits` in the background.
2. **Pre-Confirm Validation (On Write)**: The `/api/reservations/:id/confirm` transaction checks the reservation's expiry timestamp. If it has passed, the confirmation is blocked, the reservation transitions to `EXPIRED`, units are released, and a `410 Gone` error is returned.
3. **Active Cron Cleaner**: I added a secure background worker endpoint (`GET /api/cron/expire`) that can be scheduled (e.g., via Vercel Cron or GitHub Actions) to run periodically and clean up stale reservations.

---

## Getting Started

### Prerequisites
* Node.js v18+
* A hosted PostgreSQL instance (Neon, Supabase, or Railway)
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
* **Database vs. Distributed Locks**: I chose to use PostgreSQL row-level locks because it is simple and highly robust for this scale. If this were a global application receiving millions of requests per second, I would introduce a distributed lock (like Redlock) using Upstash Redis to keep concurrent write load off the primary database.
* **CDNs for Media**: For ease of use in a demonstration environment, catalog images are sourced from Unsplash. In a production build, I would host these on an optimized S3 bucket and serve them via a CDN with Next.js `<Image>` component optimization.
