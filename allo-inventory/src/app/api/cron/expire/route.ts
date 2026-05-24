import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const expiredCount = await prisma.$transaction(async (tx) => {
      // Find all pending reservations that have expired
      const expiredReservations = await tx.reservation.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() }
        }
      })

      if (expiredReservations.length === 0) return 0

      // Update statuses to EXPIRED
      await tx.reservation.updateMany({
        where: { id: { in: expiredReservations.map(r => r.id) } },
        data: { status: 'EXPIRED' }
      })

      // Decrement reserved units for each
      for (const res of expiredReservations) {
        await tx.$executeRaw`
          UPDATE "StockLevel"
          SET "reservedUnits" = "reservedUnits" - ${res.quantity},
              "updatedAt" = NOW()
          WHERE "productId" = ${res.productId} AND "warehouseId" = ${res.warehouseId}
        `
      }

      return expiredReservations.length
    })

    return NextResponse.json({ success: true, expiredCount })
  } catch (error) {
    console.error("GET /api/cron/expire error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
