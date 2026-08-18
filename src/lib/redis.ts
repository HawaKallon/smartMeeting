import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let redis: Redis | null = null;
let isRedisAvailable = false;

function initRedis(): Redis | null {
  if (!REDIS_URL) {
    console.warn('REDIS_URL not configured; caching disabled');
    return null;
  }

  try {
    redis = new Redis(REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        if (times > 10) {
          console.error('Redis connection failed after 10 retries');
          return null;
        }
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      enableReadyCheck: false,
      enableOfflineQueue: true,
      maxRetriesPerRequest: 3,
    });

    redis.on('error', (err) => {
      console.error('Redis error:', err);
      isRedisAvailable = false;
    });

    redis.on('connect', () => {
      isRedisAvailable = true;
      console.log('Redis connected');
    });

    redis.on('close', () => {
      isRedisAvailable = false;
      console.log('Redis disconnected');
    });

    return redis;
  } catch (err) {
    console.error('Failed to initialize Redis:', err);
    return null;
  }
}

export function getRedis(): Redis | null {
  if (redis === null) {
    initRedis();
  }
  return isRedisAvailable ? redis : null;
}

export function isRedisConnected(): boolean {
  return isRedisAvailable;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    isRedisAvailable = false;
  }
}
