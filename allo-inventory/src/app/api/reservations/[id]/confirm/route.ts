import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkIdempotency, saveIdempotencyResponse } from '@/lib/redis'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const reservationId = params.id
    
    // Check for idempotency key in headers
    const idempotencyKey = request.headers.get('idempotency-key')
    if (idempotencyKey) {
      const { handled, response } = await checkIdempotency(idempotencyKey)
      if (handled && response) {
        const cached = response as { status: number; body: unknown }
        return NextResponse.json(cached.body, { status: cached.status })
      }
    }

    // Process confirm in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { product: true, warehouse: true }
      })

      if (!reservation) {
        return { status: 404, body: { error: 'Reservation not found' } }
      }

      if (reservation.status !== 'PENDING') {
        return { status: 400, body: { error: `Reservation is already ${reservation.status}` } }
      }

      // Check if expired
      if (reservation.expiresAt < new Date()) {
        // Run lazy cleanup for this specific reservation
        await tx.reservation.update({
          where: { id: reservationId },
          data: { status: 'EXPIRED' }
        })
        
        await tx.$executeRaw`
          UPDATE "StockLevel"
          SET "reservedUnits" = "reservedUnits" - ${reservation.quantity},
              "updatedAt" = NOW()
          WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
        `
        return { status: 410, body: { error: 'Reservation has expired' } }
      }

      // Confirm reservation
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CONFIRMED' }
      })

      // Decrement both totalUnits and reservedUnits (moving from held to sold)
      await tx.$executeRaw`
        UPDATE "StockLevel"
        SET "totalUnits" = "totalUnits" - ${reservation.quantity},
            "reservedUnits" = "reservedUnits" - ${reservation.quantity},
            "updatedAt" = NOW()
        WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
      `

      return { status: 200, body: { reservation: updatedReservation } }
    })

    if (idempotencyKey) await saveIdempotencyResponse(idempotencyKey, result)
    return NextResponse.json(result.body, { status: result.status })

  } catch (error) {
    console.error(`POST /api/reservations/[id]/confirm error:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
