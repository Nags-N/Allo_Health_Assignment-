import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const reservationId = params.id
    
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId }
      })

      if (!reservation) {
        return { status: 404, body: { error: 'Reservation not found' } }
      }

      if (reservation.status !== 'PENDING') {
        return { status: 400, body: { error: `Reservation is already ${reservation.status}` } }
      }

      // Update reservation status
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'RELEASED' }
      })

      // Decrement reserved units
      await tx.$executeRaw`
        UPDATE "StockLevel"
        SET "reservedUnits" = "reservedUnits" - ${reservation.quantity},
            "updatedAt" = NOW()
        WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
      `

      return { status: 200, body: { reservation: updatedReservation } }
    })

    return NextResponse.json(result.body, { status: result.status })

  } catch (error) {
    console.error(`POST /api/reservations/[id]/release error:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
