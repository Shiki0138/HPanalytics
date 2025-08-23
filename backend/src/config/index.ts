import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variables schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  HOST: z.string().default('localhost'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0').transform(Number),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Security
  BCRYPT_ROUNDS: z.string().default('10').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('logs'),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000').transform((val) => val.split(',')),

  // API Keys
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_ANALYTICS_CLIENT_ID: z.string().optional(),
  GOOGLE_ANALYTICS_CLIENT_SECRET: z.string().optional(),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => err.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
};

export const config = parseEnv();

// Export individual config sections for convenience
export const serverConfig = {
  env: config.NODE_ENV,
  port: config.PORT,
  host: config.HOST,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',
};

export const databaseConfig = {
  url: config.DATABASE_URL,
};

export const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  db: config.REDIS_DB,
};

export const authConfig = {
  jwtSecret: config.JWT_SECRET,
  jwtExpiresIn: config.JWT_EXPIRES_IN,
  jwtRefreshSecret: config.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
  bcryptRounds: config.BCRYPT_ROUNDS,
};

export const securityConfig = {
  rateLimitWindowMs: config.RATE_LIMIT_WINDOW_MS,
  rateLimitMaxRequests: config.RATE_LIMIT_MAX_REQUESTS,
  allowedOrigins: config.ALLOWED_ORIGINS,
};

export const loggingConfig = {
  level: config.LOG_LEVEL,
  dir: config.LOG_DIR,
};

export const apiKeysConfig = {
  openai: config.OPENAI_API_KEY,
  googleAnalytics: {
    clientId: config.GOOGLE_ANALYTICS_CLIENT_ID,
    clientSecret: config.GOOGLE_ANALYTICS_CLIENT_SECRET,
  },
};