import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://placeholder.upstash.io',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'placeholder-token',
})

/**
 * Utility to check and set idempotency keys.
 * Returns true if the operation should proceed, false if it was already handled.
 */
export async function checkIdempotency(key: string): Promise<{ handled: boolean; response?: unknown }> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    // If no Redis, ignore idempotency logic
    return { handled: false }
  }

  const cached = await redis.get(`idempotency:${key}`)
  if (cached) {
    return { handled: true, response: cached }
  }
  return { handled: false }
}

export async function saveIdempotencyResponse(key: string, response: unknown): Promise<void> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return

  // Cache for 24 hours
  await redis.set(`idempotency:${key}`, response, { ex: 60 * 60 * 24 })
}
