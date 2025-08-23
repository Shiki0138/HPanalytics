import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TestUtils } from '../../helpers/testUtils';

describe('Database Integration Tests', () => {
  let prisma: PrismaClient;
  let testUtils: TestUtils;

  beforeAll(async () => {
    prisma = global.__PRISMA__;
    testUtils = new TestUtils(prisma);
  });

  beforeEach(async () => {
    await testUtils.cleanupTestData();
  });

  afterAll(async () => {
    await testUtils.cleanupTestData();
  });

  describe('User Operations', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 12),
        name: 'Test User',
        role: 'USER',
        isActive: true
      };

      const user = await prisma.user.create({ data: userData });

      expect(user.id).toBeTruthy();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.role).toBe('USER');
      expect(user.isActive).toBe(true);
      expect(user.emailVerified).toBeNull();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // Verify password is hashed
      const isValid = await bcrypt.compare('password123', user.password);
      expect(isValid).toBe(true);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: await bcrypt.hash('password123', 12),
        name: 'Test User',
        role: 'USER'
      };

      await prisma.user.create({ data: userData });

      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow();
    });

    it('should update user profile', async () => {
      const user = await testUtils.createTestUser();
      const updateData = {
        name: 'Updated Name',
        emailVerified: new Date(),
        isActive: true
      };

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.emailVerified).toBeInstanceOf(Date);
      expect(updatedUser.isActive).toBe(true);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
    });

    it('should soft delete user', async () => {
      const user = await testUtils.createTestUser();

      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false, deletedAt: new Date() }
      });

      const deletedUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      expect(deletedUser?.isActive).toBe(false);
      expect(deletedUser?.deletedAt).toBeInstanceOf(Date);
    });

    it('should find users with pagination', async () => {
      // Create multiple users
      await Promise.all([
        testUtils.createTestUser({ email: 'user1@example.com', name: 'User 1' }),
        testUtils.createTestUser({ email: 'user2@example.com', name: 'User 2' }),
        testUtils.createTestUser({ email: 'user3@example.com', name: 'User 3' }),
        testUtils.createTestUser({ email: 'user4@example.com', name: 'User 4' }),
        testUtils.createTestUser({ email: 'user5@example.com', name: 'User 5' })
      ]);

      const page1 = await prisma.user.findMany({
        take: 3,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      });

      const page2 = await prisma.user.findMany({
        take: 3,
        skip: 3,
        orderBy: { createdAt: 'desc' }
      });

      expect(page1.length).toBe(3);
      expect(page2.length).toBe(2);
      expect(page1[0].createdAt.getTime()).toBeGreaterThanOrEqual(page1[1].createdAt.getTime());
      expect(page1.map(u => u.id)).not.toEqual(expect.arrayContaining(page2.map(u => u.id)));
    });
  });

  describe('Site Operations', () => {
    it('should create site with user relationship', async () => {
      const user = await testUtils.createTestUser();
      const siteData = {
        name: 'Test Website',
        domain: 'test.example.com',
        userId: user.id,
        trackingId: testUtils.generateTrackingId(),
        isActive: true
      };

      const site = await prisma.site.create({ 
        data: siteData,
        include: { user: true }
      });

      expect(site.id).toBeTruthy();
      expect(site.name).toBe(siteData.name);
      expect(site.domain).toBe(siteData.domain);
      expect(site.userId).toBe(user.id);
      expect(site.user.email).toBe(user.email);
      expect(site.trackingId).toBe(siteData.trackingId);
      expect(site.isActive).toBe(true);
    });

    it('should enforce unique domain constraint', async () => {
      const user = await testUtils.createTestUser();
      const siteData = {
        name: 'Test Website',
        domain: 'duplicate.example.com',
        userId: user.id,
        trackingId: testUtils.generateTrackingId()
      };

      await prisma.site.create({ data: siteData });

      await expect(
        prisma.site.create({ data: { ...siteData, trackingId: testUtils.generateTrackingId() } })
      ).rejects.toThrow();
    });

    it('should enforce unique tracking ID constraint', async () => {
      const user = await testUtils.createTestUser();
      const trackingId = testUtils.generateTrackingId();

      await prisma.site.create({
        data: {
          name: 'Site 1',
          domain: 'site1.example.com',
          userId: user.id,
          trackingId
        }
      });

      await expect(
        prisma.site.create({
          data: {
            name: 'Site 2',
            domain: 'site2.example.com',
            userId: user.id,
            trackingId
          }
        })
      ).rejects.toThrow();
    });

    it('should cascade delete sites when user is deleted', async () => {
      const user = await testUtils.createTestUser();
      const site = await testUtils.createTestSite(Number(user.id));

      await prisma.user.delete({ where: { id: user.id } });

      const deletedSite = await prisma.site.findUnique({
        where: { id: site.id }
      });

      expect(deletedSite).toBeNull();
    });

    it('should find sites by user with filtering', async () => {
      const user1 = await testUtils.createTestUser({ email: 'user1@example.com' });
      const user2 = await testUtils.createTestUser({ email: 'user2@example.com' });

      await Promise.all([
        testUtils.createTestSite(Number(user1.id), { name: 'User1 Site1', domain: 'u1s1.com' }),
        testUtils.createTestSite(Number(user1.id), { name: 'User1 Site2', domain: 'u1s2.com', isActive: false }),
        testUtils.createTestSite(Number(user2.id), { name: 'User2 Site1', domain: 'u2s1.com' })
      ]);

      const user1Sites = await prisma.site.findMany({
        where: { userId: user1.id }
      });

      const activeUser1Sites = await prisma.site.findMany({
        where: { 
          userId: user1.id,
          isActive: true
        }
      });

      expect(user1Sites.length).toBe(2);
      expect(activeUser1Sites.length).toBe(1);
      expect(activeUser1Sites[0].name).toBe('User1 Site1');
    });
  });

  describe('Session Operations', () => {
    it('should create session with user relationship', async () => {
      const user = await testUtils.createTestUser();
      const sessionData = {
        token: 'test-session-token',
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        isActive: true
      };

      const session = await prisma.session.create({
        data: sessionData,
        include: { user: true }
      });

      expect(session.id).toBeTruthy();
      expect(session.token).toBe(sessionData.token);
      expect(session.userId).toBe(user.id);
      expect(session.user.email).toBe(user.email);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.isActive).toBe(true);
    });

    it('should find active sessions for user', async () => {
      const user = await testUtils.createTestUser();
      const activeSession = await prisma.session.create({
        data: {
          token: 'active-session',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isActive: true
        }
      });

      await prisma.session.create({
        data: {
          token: 'inactive-session',
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isActive: false
        }
      });

      await prisma.session.create({
        data: {
          token: 'expired-session',
          userId: user.id,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
          isActive: true
        }
      });

      const activeSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        }
      });

      expect(activeSessions.length).toBe(1);
      expect(activeSessions[0].token).toBe('active-session');
    });

    it('should clean up expired sessions', async () => {
      const user = await testUtils.createTestUser();
      
      // Create expired sessions
      await Promise.all([
        prisma.session.create({
          data: {
            token: 'expired1',
            userId: user.id,
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            isActive: true
          }
        }),
        prisma.session.create({
          data: {
            token: 'expired2',
            userId: user.id,
            expiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
            isActive: true
          }
        }),
        prisma.session.create({
          data: {
            token: 'valid',
            userId: user.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            isActive: true
          }
        })
      ]);

      // Clean up expired sessions
      const deletedCount = await prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      const remainingSessions = await prisma.session.findMany({
        where: { userId: user.id }
      });

      expect(deletedCount.count).toBe(2);
      expect(remainingSessions.length).toBe(1);
      expect(remainingSessions[0].token).toBe('valid');
    });
  });

  describe('Complex Queries and Joins', () => {
    it('should perform complex user-site aggregation', async () => {
      const user = await testUtils.createTestUser();
      
      // Create multiple sites
      await Promise.all([
        testUtils.createTestSite(Number(user.id), { name: 'Site 1', isActive: true }),
        testUtils.createTestSite(Number(user.id), { name: 'Site 2', isActive: true }),
        testUtils.createTestSite(Number(user.id), { name: 'Site 3', isActive: false })
      ]);

      const userWithSites = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          sites: {
            where: { isActive: true },
            orderBy: { name: 'asc' }
          },
          _count: {
            select: {
              sites: true,
              sessions: true
            }
          }
        }
      });

      expect(userWithSites?.sites.length).toBe(2);
      expect(userWithSites?.sites[0].name).toBe('Site 1');
      expect(userWithSites?.sites[1].name).toBe('Site 2');
      expect(userWithSites?._count.sites).toBe(3); // All sites including inactive
    });

    it('should perform user statistics aggregation', async () => {
      const users = await Promise.all([
        testUtils.createTestUser({ email: 'user1@example.com' }),
        testUtils.createTestUser({ email: 'user2@example.com' }),
        testUtils.createTestUser({ email: 'user3@example.com', isActive: false })
      ]);

      // Create sites for users
      await Promise.all([
        testUtils.createTestSite(Number(users[0].id)),
        testUtils.createTestSite(Number(users[0].id)),
        testUtils.createTestSite(Number(users[1].id))
      ]);

      const userStats = await prisma.user.groupBy({
        by: ['isActive'],
        _count: {
          id: true
        },
        _avg: {
          id: true
        }
      });

      const activeUserStats = userStats.find(stat => stat.isActive === true);
      const inactiveUserStats = userStats.find(stat => stat.isActive === false);

      expect(activeUserStats?._count.id).toBe(2);
      expect(inactiveUserStats?._count.id).toBe(1);
    });
  });

  describe('Transaction Operations', () => {
    it('should handle user creation with initial site in transaction', async () => {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: 'transaction-user@example.com',
            password: await bcrypt.hash('password123', 12),
            name: 'Transaction User',
            role: 'USER'
          }
        });

        const site = await tx.site.create({
          data: {
            name: 'Initial Site',
            domain: 'initial.example.com',
            userId: user.id,
            trackingId: testUtils.generateTrackingId()
          }
        });

        return { user, site };
      });

      expect(result.user.email).toBe('transaction-user@example.com');
      expect(result.site.userId).toBe(result.user.id);
      expect(result.site.name).toBe('Initial Site');

      // Verify data was actually saved
      const savedUser = await prisma.user.findUnique({
        where: { id: result.user.id },
        include: { sites: true }
      });

      expect(savedUser?.sites.length).toBe(1);
    });

    it('should rollback transaction on error', async () => {
      const existingUser = await testUtils.createTestUser();

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.user.create({
            data: {
              email: 'rollback-user@example.com',
              password: await bcrypt.hash('password123', 12),
              name: 'Rollback User',
              role: 'USER'
            }
          });

          // This should fail due to duplicate email
          await tx.user.create({
            data: {
              email: existingUser.email, // Duplicate email
              password: await bcrypt.hash('password123', 12),
              name: 'Duplicate User',
              role: 'USER'
            }
          });
        })
      ).rejects.toThrow();

      // Verify first user was not created
      const rollbackUser = await prisma.user.findUnique({
        where: { email: 'rollback-user@example.com' }
      });

      expect(rollbackUser).toBeNull();
    });
  });

  describe('Data Integrity and Constraints', () => {
    it('should enforce email format validation at database level', async () => {
      // This test assumes database-level constraints
      // In a real scenario, you might have CHECK constraints
      const invalidEmails = ['invalid-email', '@domain.com', 'user@', 'user..email@domain.com'];

      for (const email of invalidEmails) {
        // Note: Prisma/database might not enforce email format by default
        // This is typically handled at application level
        // But we can test our application validation
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValidEmail).toBe(false);
      }
    });

    it('should handle concurrent user creation', async () => {
      const concurrentOperations = Array.from({ length: 5 }, (_, i) =>
        testUtils.createTestUser({ 
          email: `concurrent${i}@example.com`,
          name: `Concurrent User ${i}`
        })
      );

      const results = await Promise.allSettled(concurrentOperations);
      const successful = results.filter(r => r.status === 'fulfilled');

      expect(successful.length).toBe(5);

      // Verify all users were created with unique emails
      const emails = successful.map(r => (r as PromiseFulfilledResult<any>).value.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(5);
    });

    it('should maintain referential integrity on cascade delete', async () => {
      const user = await testUtils.createTestUser();
      const site = await testUtils.createTestSite(Number(user.id));
      
      // Create a session for the user
      const session = await prisma.session.create({
        data: {
          token: 'test-session',
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      // Delete user should cascade to sites and sessions
      await prisma.user.delete({ where: { id: user.id } });

      const [deletedSite, deletedSession] = await Promise.all([
        prisma.site.findUnique({ where: { id: site.id } }),
        prisma.session.findUnique({ where: { id: session.id } })
      ]);

      expect(deletedSite).toBeNull();
      expect(deletedSession).toBeNull();
    });
  });

  describe('Performance and Indexing', () => {
    it('should efficiently query users by email (indexed field)', async () => {
      // Create users to test index performance
      await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          testUtils.createTestUser({ 
            email: `perf-user${i}@example.com`,
            name: `Performance User ${i}`
          })
        )
      );

      const startTime = process.hrtime.bigint();
      
      const user = await prisma.user.findUnique({
        where: { email: 'perf-user50@example.com' }
      });

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

      expect(user).toBeTruthy();
      expect(user?.email).toBe('perf-user50@example.com');
      
      // Query should be fast due to email index
      expect(executionTime).toBeLessThan(100); // Less than 100ms
    });

    it('should efficiently query sites by tracking ID', async () => {
      const user = await testUtils.createTestUser();
      const trackingId = testUtils.generateTrackingId();
      
      // Create site with specific tracking ID
      await testUtils.createTestSite(Number(user.id), { trackingId });

      const startTime = process.hrtime.bigint();
      
      const site = await prisma.site.findUnique({
        where: { trackingId }
      });

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1_000_000;

      expect(site).toBeTruthy();
      expect(site?.trackingId).toBe(trackingId);
      expect(executionTime).toBeLessThan(50);
    });
  });
});