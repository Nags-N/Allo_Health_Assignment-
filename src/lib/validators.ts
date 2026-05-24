import { z } from 'zod'

export const reserveSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  warehouseId: z.string().uuid("Invalid warehouse ID"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  idempotencyKey: z.string().uuid("Invalid idempotency key format").optional(),
})

export type ReserveRequest = z.infer<typeof reserveSchema>
