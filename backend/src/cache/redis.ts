import Redis from 'ioredis';

/** Cache TTL for flag data (seconds) */
export const FLAG_CACHE_TTL = 30;

let client: Redis | null = null;

/** Returns (or lazily creates) the singleton Redis client */
export function getRedisClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    client = new Redis(url, {
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3_000),
      maxRetriesPerRequest: 3,
    });
    client.on('connect', () => console.log('✅ Redis connected'));
    client.on('error', (err) => console.error('Redis error:', err.message));
  }
  return client;
}

/**
 * Builds the cache key for a flag/environment pair.
 * Pattern: flag:{projectId}:{flagKey}:{environment}
 */
export function buildFlagCacheKey(
  projectId: string,
  flagKey: string,
  environment: string
): string {
  return `flag:${projectId}:${flagKey}:${environment}`;
}

/** Retrieves a cached value, returning null on miss */
export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await getRedisClient().get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

/** Stores a value in Redis with the given TTL */
export async function setCached(
  key: string,
  value: unknown,
  ttlSeconds: number = FLAG_CACHE_TTL
): Promise<void> {
  await getRedisClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

/** Deletes a single cache key */
export async function invalidateKey(key: string): Promise<void> {
  await getRedisClient().del(key);
}

/**
 * Deletes all keys matching a glob pattern using SCAN (safe for production —
 * never blocks the event loop like KEYS would).
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

/** Gracefully closes the Redis connection */
export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
