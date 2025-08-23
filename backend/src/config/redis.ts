import Redis from 'ioredis';
import { createLogger } from '../utils/logger';
import { redisConfig, serverConfig } from './index';

const logger = createLogger('redis');

// Create Redis client
const redis = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// Redis event handlers
redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (error) => {
  logger.error('Redis client error:', error);
});

redis.on('close', () => {
  logger.info('Redis client closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect();
    // Test connection
    await redis.ping();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    // Don't throw in production - Redis might be optional
    if (serverConfig.isProduction) {
      logger.warn('Continuing without Redis cache');
    } else {
      throw error;
    }
  }
};

// Disconnect from Redis
export const disconnectRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('Redis disconnected successfully');
  } catch (error) {
    logger.error('Redis disconnection failed:', error);
    redis.disconnect();
  }
};

// Cache utility functions
export const cache = {
  // Get value from cache
  get: async <T = any>(key: string): Promise<T | null> => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  },

  // Set value in cache
  set: async (key: string, value: any, ttl?: number): Promise<boolean> => {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error });
      return false;
    }
  },

  // Delete value from cache
  del: async (key: string | string[]): Promise<boolean> => {
    try {
      const keys = Array.isArray(key) ? key : [key];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
      return false;
    }
  },

  // Clear cache by pattern
  clear: async (pattern: string): Promise<boolean> => {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache clear error:', { pattern, error });
      return false;
    }
  },

  // Check if key exists
  exists: async (key: string): Promise<boolean> => {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  },

  // Set expiration time
  expire: async (key: string, ttl: number): Promise<boolean> => {
    try {
      const result = await redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error:', { key, ttl, error });
      return false;
    }
  },
};

// Handle process termination
process.on('beforeExit', async () => {
  await disconnectRedis();
});

export default redis;