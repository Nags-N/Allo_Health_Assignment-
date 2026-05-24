import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        warehouse: true
      }
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    return NextResponse.json({ reservation })
  } catch (error) {
    console.error(`GET /api/reservations/[id] error:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
