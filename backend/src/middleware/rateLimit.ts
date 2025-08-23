import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { securityConfig } from '../config';
import { createLogger } from '../utils/logger';
import redis from '../config/redis';

const logger = createLogger('rate-limit');

// Rate limit error response
const rateLimitErrorResponse = (req: Request, res: Response) => {
  logger.warn('Rate limit exceeded:', {
    ip: req.ip,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
  });

  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil(securityConfig.rateLimitWindowMs / 1000),
    },
  });
};

// Key generator for rate limiting
const keyGenerator = (req: Request): string => {
  // Use user ID if authenticated, otherwise use IP
  const userId = req.user?.id;
  return userId ? `user:${userId}` : `ip:${req.ip}`;
};

// Redis store for rate limiting
const redisStore = {
  async incr(key: string): Promise<{ totalHits: number; timeToExpire?: number }> {
    try {
      const multi = redis.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(securityConfig.rateLimitWindowMs / 1000));
      multi.ttl(key);
      
      const results = await multi.exec();
      
      if (!results || results.length !== 3) {
        throw new Error('Redis multi command failed');
      }

      const totalHits = results[0][1] as number;
      const ttl = results[2][1] as number;
      const timeToExpire = ttl > 0 ? ttl * 1000 : undefined;

      return { totalHits, timeToExpire };
    } catch (error) {
      logger.error('Redis rate limit store error:', error);
      // Fallback to allowing request if Redis fails
      return { totalHits: 0 };
    }
  },

  async decrement(key: string): Promise<void> {
    try {
      const current = await redis.get(key);
      if (current && parseInt(current) > 0) {
        await redis.decr(key);
      }
    } catch (error) {
      logger.error('Redis decrement error:', error);
    }
  },

  async resetKey(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Redis reset key error:', error);
    }
  },
};

// General rate limiter
export const generalRateLimit = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  max: securityConfig.rateLimitMaxRequests,
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/metrics';
  },
  store: {
    incr: redisStore.incr,
    decrement: redisStore.decrement,
    resetKey: redisStore.resetKey,
  },
});

// Strict rate limiter for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `auth:${req.ip}`, // Always use IP for auth endpoints
  skipSuccessfulRequests: true, // Don't count successful requests
  store: {
    incr: redisStore.incr,
    decrement: redisStore.decrement,
    resetKey: redisStore.resetKey,
  },
});

// API rate limiter for data collection
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // High limit for analytics data collection
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use tracking ID if available for analytics endpoints
    const trackingId = req.headers['x-tracking-id'] as string;
    return trackingId ? `tracking:${trackingId}` : keyGenerator(req);
  },
  store: {
    incr: redisStore.incr,
    decrement: redisStore.decrement,
    resetKey: redisStore.resetKey,
  },
});

// Admin rate limiter (more lenient)
export const adminRateLimit = rateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  max: securityConfig.rateLimitMaxRequests * 5, // 5x the normal limit
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: (req) => {
    // Only apply to admin users
    return req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPER_ADMIN';
  },
  store: {
    incr: redisStore.incr,
    decrement: redisStore.decrement,
    resetKey: redisStore.resetKey,
  },
});

// Burst rate limiter for analytics data
export const burstRateLimit = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second
  message: rateLimitErrorResponse,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  store: {
    incr: redisStore.incr,
    decrement: redisStore.decrement,
    resetKey: redisStore.resetKey,
  },
});

// Create custom rate limiter
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) => {
  return rateLimit({
    ...options,
    message: options.message ? 
      (req: Request, res: Response) => {
        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: options.message,
            timestamp: new Date().toISOString(),
          },
        });
      } : rateLimitErrorResponse,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || keyGenerator,
    store: {
      incr: redisStore.incr,
      decrement: redisStore.decrement,
      resetKey: redisStore.resetKey,
    },
  });
};

// IP-based rate limiter
export const ipRateLimit = createRateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  max: securityConfig.rateLimitMaxRequests,
  keyGenerator: (req) => `ip:${req.ip}`,
});

// User-based rate limiter
export const userRateLimit = createRateLimit({
  windowMs: securityConfig.rateLimitWindowMs,
  max: securityConfig.rateLimitMaxRequests * 2,
  keyGenerator: (req) => req.user ? `user:${req.user.id}` : `ip:${req.ip}`,
});

// Endpoint-specific rate limiters
export const endpointRateLimits = {
  // Password reset
  passwordReset: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts',
  }),

  // Registration
  registration: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many registration attempts',
  }),

  // Email verification
  emailVerification: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    message: 'Too many email verification attempts',
  }),

  // Site creation
  siteCreation: createRateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10,
    message: 'Too many sites created today',
  }),
};