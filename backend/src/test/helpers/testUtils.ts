import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export class TestUtils {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createTestUser(userData?: Partial<any>) {
    const defaultUser = {
      email: 'test@example.com',
      password: await bcrypt.hash('password123', 12),
      name: 'Test User',
      role: 'USER',
      emailVerified: new Date(),
      isActive: true,
      ...userData
    };

    return await this.prisma.user.create({
      data: defaultUser
    });
  }

  async createTestAdmin(userData?: Partial<any>) {
    return await this.createTestUser({
      role: 'ADMIN',
      email: 'admin@example.com',
      name: 'Test Admin',
      ...userData
    });
  }

  generateJWT(userId: number, role: string = 'USER'): string {
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  }

  async createTestSite(userId: number, siteData?: Partial<any>) {
    const defaultSite = {
      name: 'Test Site',
      domain: 'test.example.com',
      userId,
      trackingId: this.generateTrackingId(),
      isActive: true,
      ...siteData
    };

    return await this.prisma.site.create({
      data: defaultSite
    });
  }

  generateTrackingId(): string {
    return 'test_' + Math.random().toString(36).substr(2, 9);
  }

  async cleanupTestData() {
    // Clean up in reverse order of dependencies
    await this.prisma.session.deleteMany({});
    await this.prisma.site.deleteMany({});
    await this.prisma.user.deleteMany({});
  }

  createMockRequest(data: any = {}) {
    return {
      body: data,
      params: {},
      query: {},
      headers: {},
      user: undefined,
      ...data
    };
  }

  createMockResponse() {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    return res;
  }

  createMockNext() {
    return jest.fn();
  }
}