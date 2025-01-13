import Redis, { RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const REDIS_QUEUE_URL = process.env.REDIS_QUEUE_URL || REDIS_URL;

export const getRedisClient = (redisUrl: string, redisOpts?: RedisOptions) => {
  const client = new Redis(redisUrl, {
    connectTimeout: 5_000,
    maxRetriesPerRequest: null,
    ...redisOpts,
  });
  return client;
};

export const redisCache = getRedisClient(REDIS_URL);
export const redisQueue = getRedisClient(REDIS_QUEUE_URL);

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  { ttl = 60 * 60 * 24 }: { ttl?: number } = {}
) {
  const cached = await redisCache.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const result = await fetcher();

  await redisCache.setex(key, ttl, JSON.stringify(result));

  return result;
}
