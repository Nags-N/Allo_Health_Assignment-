import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reserveSchema } from '@/lib/validators'
import { checkIdempotency, saveIdempotencyResponse } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = reserveSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid request data', details: result.error.format() }, { status: 400 })
    }

    const { productId, warehouseId, quantity, idempotencyKey } = result.data

    // 1. Idempotency Check
    if (idempotencyKey) {
      const { handled, response } = await checkIdempotency(idempotencyKey)
      if (handled) return NextResponse.json(response.body, { status: response.status })
    }

    // 2. Atomic Reservation Logic
    // We try to increment reservedUnits ONLY if (totalUnits - reservedUnits) >= quantity
    // The returned count will be 1 if successful, 0 if insufficient stock.
    const updateCount = await prisma.$executeRaw`
      UPDATE "StockLevel"
      SET "reservedUnits" = "reservedUnits" + ${quantity},
          "updatedAt" = NOW()
      WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
        AND ("totalUnits" - "reservedUnits") >= ${quantity}
    `

    if (updateCount === 0) {
      const response = { error: 'Not enough stock available' }
      if (idempotencyKey) await saveIdempotencyResponse(idempotencyKey, { status: 409, body: response })
      return NextResponse.json(response, { status: 409 })
    }

    // 3. Create Reservation Record
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    
    const reservation = await prisma.reservation.create({
      data: {
        productId,
        warehouseId,
        quantity,
        status: 'PENDING',
        expiresAt,
        idempotencyKey,
      }
    })

    const successResponse = { reservation }
    if (idempotencyKey) await saveIdempotencyResponse(idempotencyKey, { status: 201, body: successResponse })
    
    return NextResponse.json(successResponse, { status: 201 })

  } catch (error) {
    console.error("POST /api/reservations error:", error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
