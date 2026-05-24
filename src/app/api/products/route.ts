import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Lazy cleanup of expired PENDING reservations before returning products
    await prisma.$executeRaw`
      WITH expired AS (
        UPDATE "Reservation"
        SET status = 'EXPIRED', "updatedAt" = NOW()
        WHERE status = 'PENDING' AND "expiresAt" < NOW()
        RETURNING "productId", "warehouseId", quantity
      )
      UPDATE "StockLevel" s
      SET "reservedUnits" = s."reservedUnits" - e.quantity,
          "updatedAt" = NOW()
      FROM expired e
      WHERE s."productId" = e."productId" AND s."warehouseId" = e."warehouseId"
    `
  } catch (error) {
    console.error("Failed to run lazy expiry cleanup:", error)
    // Non-fatal, continue returning products
  }

  try {
    const products = await prisma.product.findMany({
      include: {
        stockLevels: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      warehouses: product.stockLevels.map((sl) => ({
        warehouseId: sl.warehouse.id,
        warehouseName: sl.warehouse.name,
        available: Math.max(0, sl.totalUnits - sl.reservedUnits),
      })),
    }))

    return NextResponse.json({ products: formattedProducts })
  } catch (error) {
    console.error("GET /api/products error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
