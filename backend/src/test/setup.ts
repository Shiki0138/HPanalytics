import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

declare global {
  var __PRISMA__: PrismaClient;
}

let prisma: PrismaClient;

beforeAll(async () => {
  // Initialize test database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || 'file:./test.db'
      }
    }
  });

  global.__PRISMA__ = prisma;

  // Run migrations for test database
  // You might want to implement a test database setup here
});

beforeEach(async () => {
  // Clean up database before each test
  if (prisma) {
    // Clear all tables in the correct order to avoid foreign key constraints
    await prisma.session.deleteMany({});
    await prisma.site.deleteMany({});
    await prisma.user.deleteMany({});
  }
});

afterAll(async () => {
  // Close database connection after all tests
  if (prisma) {
    await prisma.$disconnect();
  }
});

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_URL = 'redis://localhost:6379';