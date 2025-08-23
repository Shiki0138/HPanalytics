import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { serverConfig } from './index';

const logger = createLogger('database');

// Create Prisma client with logging configuration
const prisma = new PrismaClient({
  log: serverConfig.isDevelopment
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
  errorFormat: serverConfig.isDevelopment ? 'pretty' : 'minimal',
});

// Log database queries in development
if (serverConfig.isDevelopment) {
  prisma.$on('query' as never, (e: any) => {
    logger.debug('Query:', {
      query: e.query,
      params: e.params,
      duration: e.duration,
    });
  });
}

// Test database connection
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Gracefully disconnect from database
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Database disconnection failed:', error);
    throw error;
  }
};

// Handle process termination
process.on('beforeExit', async () => {
  await disconnectDatabase();
});

export default prisma;