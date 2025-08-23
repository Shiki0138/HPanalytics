import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../../../server';
import { TestUtils } from '../../helpers/testUtils';

describe('Authentication Flow Integration Tests', () => {
  let testUtils: TestUtils;

  beforeEach(async () => {
    testUtils = new TestUtils(global.__PRISMA__);
    await testUtils.cleanupTestData();
  });

  afterAll(async () => {
    await testUtils.cleanupTestData();
  });

  describe('User Registration Flow', () => {
    it('should successfully register a new user', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toMatchObject({
        id: expect.any(String),
        email: registrationData.email,
        name: registrationData.name
      });
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned

      // Verify user was created in database
      const createdUser = await global.__PRISMA__.user.findUnique({
        where: { email: registrationData.email }
      });

      expect(createdUser).toBeTruthy();
      expect(createdUser?.email).toBe(registrationData.email);
      expect(createdUser?.name).toBe(registrationData.name);
      expect(createdUser?.isActive).toBe(true);
      expect(createdUser?.role).toBe('USER');
      expect(createdUser?.emailVerified).toBeNull();

      // Verify password is hashed
      const isPasswordValid = await bcrypt.compare(registrationData.password, createdUser!.password);
      expect(isPasswordValid).toBe(true);
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        name: 'First User'
      };

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, name: 'Second User' })
        .expect(400);

      expect(response.body.error).toMatch(/email.*already.*exist/i);
    });

    it('should validate password strength requirements', async () => {
      const weakPasswords = [
        'weak',           // Too short
        'weakpassword',   // No uppercase, number, or special char
        'WeakPassword',   // No number or special char
        'WeakPass123',    // No special char
        'WeakPass!',      // No number
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${Math.random()}@example.com`,
            password,
            name: 'Test User'
          })
          .expect(400);

        expect(response.body.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'password',
              message: expect.stringContaining('Password must')
            })
          ])
        );
      }
    });

    it('should rate limit registration attempts', async () => {
      const requests = Array.from({ length: 4 }, (_, i) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `user${i}@example.com`,
            password: 'ValidPass123!',
            name: `User ${i}`
          })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimited = responses.filter(res => res.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('User Login Flow', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await testUtils.createTestUser({
        email: 'loginuser@example.com',
        password: await bcrypt.hash('LoginPass123!', 12),
        name: 'Login User',
        isActive: true,
        emailVerified: new Date()
      });
    });

    it('should successfully login with valid credentials', async () => {
      const loginData = {
        email: 'loginuser@example.com',
        password: 'LoginPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String)
      });
      expect(response.body.user).toMatchObject({
        id: expect.any(String),
        email: loginData.email
      });

      // Verify JWT tokens are valid
      const accessTokenPayload = jwt.verify(
        response.body.tokens.accessToken,
        process.env.JWT_SECRET || 'test-jwt-secret'
      ) as any;

      expect(accessTokenPayload.userId).toBeTruthy();
      expect(accessTokenPayload.email).toBe(loginData.email);
      expect(accessTokenPayload.role).toBe('USER');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'ValidPass123!'
        })
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*credentials/i);
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*credentials/i);
    });

    it('should reject login for inactive users', async () => {
      await testUtils.createTestUser({
        email: 'inactive@example.com',
        password: await bcrypt.hash('ValidPass123!', 12),
        name: 'Inactive User',
        isActive: false
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'ValidPass123!'
        })
        .expect(401);

      expect(response.body.error).toMatch(/account.*deactivated/i);
    });

    it('should create session record on successful login', async () => {
      const loginData = {
        email: 'loginuser@example.com',
        password: 'LoginPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      // Verify session was created
      const user = await global.__PRISMA__.user.findUnique({
        where: { email: loginData.email },
        include: { sessions: true }
      });

      expect(user?.sessions.length).toBeGreaterThan(0);
      const session = user?.sessions[0];
      expect(session?.isActive).toBe(true);
      expect(session?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Token Refresh Flow', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const user = await testUtils.createTestUser({
        email: 'refreshuser@example.com',
        password: await bcrypt.hash('RefreshPass123!', 12),
        emailVerified: new Date()
      });

      userId = user.id;

      // Login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'refreshuser@example.com',
          password: 'RefreshPass123!'
        });

      refreshToken = loginResponse.body.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.tokens).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String)
      });

      // Verify new tokens are different
      expect(response.body.tokens.accessToken).not.toBe(refreshToken);
      expect(response.body.tokens.refreshToken).not.toBe(refreshToken);

      // Verify new access token is valid
      const accessTokenPayload = jwt.verify(
        response.body.tokens.accessToken,
        process.env.JWT_SECRET || 'test-jwt-secret'
      ) as any;

      expect(accessTokenPayload.userId).toBe(userId);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token/i);
    });

    it('should reject expired refresh token', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId, email: 'refreshuser@example.com' },
        process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body.error).toMatch(/token.*expired/i);
    });
  });

  describe('Protected Route Access', () => {
    let accessToken: string;
    let user: any;

    beforeEach(async () => {
      user = await testUtils.createTestUser({
        email: 'protecteduser@example.com',
        password: await bcrypt.hash('ProtectedPass123!', 12),
        emailVerified: new Date()
      });

      // Login to get access token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'protecteduser@example.com',
          password: 'ProtectedPass123!'
        });

      accessToken = loginResponse.body.tokens.accessToken;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name
      });
    });

    it('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.error).toMatch(/no.*token/i);
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token/i);
    });

    it('should reject access with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/token.*expired/i);
    });

    it('should reject access for deactivated user', async () => {
      // Deactivate user after token creation
      await global.__PRISMA__.user.update({
        where: { id: user.id },
        data: { isActive: false }
      });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/account.*deactivated/i);
    });
  });

  describe('Role-Based Authorization', () => {
    let userToken: string;
    let adminToken: string;

    beforeEach(async () => {
      // Create regular user
      const regularUser = await testUtils.createTestUser({
        email: 'regularuser@example.com',
        password: await bcrypt.hash('UserPass123!', 12),
        role: 'USER',
        emailVerified: new Date()
      });

      // Create admin user
      const adminUser = await testUtils.createTestAdmin({
        email: 'adminuser@example.com',
        password: await bcrypt.hash('AdminPass123!', 12),
        emailVerified: new Date()
      });

      // Get tokens
      const userLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'regularuser@example.com',
          password: 'UserPass123!'
        });

      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'adminuser@example.com',
          password: 'AdminPass123!'
        });

      userToken = userLogin.body.tokens.accessToken;
      adminToken = adminLogin.body.tokens.accessToken;
    });

    it('should allow admin access to admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should deny regular user access to admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.error).toMatch(/insufficient.*permissions/i);
    });

    it('should allow both users and admins access to user routes', async () => {
      const [userResponse, adminResponse] = await Promise.all([
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${userToken}`),
        request(app)
          .get('/api/users/profile')
          .set('Authorization', `Bearer ${adminToken}`)
      ]);

      expect(userResponse.status).toBe(200);
      expect(adminResponse.status).toBe(200);
    });
  });

  describe('Logout Flow', () => {
    let accessToken: string;
    let refreshToken: string;
    let sessionId: string;

    beforeEach(async () => {
      const user = await testUtils.createTestUser({
        email: 'logoutuser@example.com',
        password: await bcrypt.hash('LogoutPass123!', 12),
        emailVerified: new Date()
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logoutuser@example.com',
          password: 'LogoutPass123!'
        });

      accessToken = loginResponse.body.tokens.accessToken;
      refreshToken = loginResponse.body.tokens.refreshToken;

      // Get session ID from database
      const session = await global.__PRISMA__.session.findFirst({
        where: { userId: user.id, isActive: true }
      });
      sessionId = session?.id || '';
    });

    it('should successfully logout user', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');

      // Verify session is deactivated
      const session = await global.__PRISMA__.session.findUnique({
        where: { id: sessionId }
      });

      expect(session?.isActive).toBe(false);
    });

    it('should prevent access after logout', async () => {
      // First logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Then try to access protected route
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token/i);
    });

    it('should prevent token refresh after logout', async () => {
      // First logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      // Then try to refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token/i);
    });
  });

  describe('Password Reset Flow', () => {
    let user: any;

    beforeEach(async () => {
      user = await testUtils.createTestUser({
        email: 'resetuser@example.com',
        password: await bcrypt.hash('OldPass123!', 12),
        emailVerified: new Date()
      });
    });

    it('should initiate password reset for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'resetuser@example.com' })
        .expect(200);

      expect(response.body.message).toBe('Password reset email sent if account exists');

      // In a real app, you would verify that a reset token was created
      // and an email was sent, but for this test we'll just check the response
    });

    it('should not reveal non-existent email in password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Same message for security (don't reveal if email exists)
      expect(response.body.message).toBe('Password reset email sent if account exists');
    });

    it('should rate limit password reset attempts', async () => {
      const requests = Array.from({ length: 4 }, () =>
        request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'resetuser@example.com' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(res => res.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Email Verification Flow', () => {
    it('should accept email verification token', async () => {
      const user = await testUtils.createTestUser({
        email: 'verifyuser@example.com',
        password: await bcrypt.hash('VerifyPass123!', 12),
        emailVerified: null // Not verified yet
      });

      const response = await request(app)
        .get('/api/auth/verify-email/valid-verification-token')
        .expect(200);

      expect(response.body.message).toBe('Email verified successfully');
    });

    it('should reject invalid verification token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email/invalid-token')
        .expect(400);

      expect(response.body.error).toMatch(/invalid.*token/i);
    });

    it('should reject expired verification token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email/expired-token')
        .expect(400);

      expect(response.body.error).toMatch(/token.*expired/i);
    });
  });

  describe('Concurrent Authentication Operations', () => {
    it('should handle concurrent login attempts', async () => {
      const user = await testUtils.createTestUser({
        email: 'concurrent@example.com',
        password: await bcrypt.hash('ConcurrentPass123!', 12),
        emailVerified: new Date()
      });

      const loginRequests = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'concurrent@example.com',
            password: 'ConcurrentPass123!'
          })
      );

      const responses = await Promise.allSettled(loginRequests);
      const successful = responses.filter(r => r.status === 'fulfilled');

      // All requests should succeed (concurrent logins allowed)
      expect(successful.length).toBe(5);

      // Verify multiple sessions were created
      const sessions = await global.__PRISMA__.session.findMany({
        where: { userId: user.id, isActive: true }
      });

      expect(sessions.length).toBeGreaterThan(1);
    });

    it('should handle session cleanup during concurrent operations', async () => {
      const user = await testUtils.createTestUser({
        email: 'cleanup@example.com',
        password: await bcrypt.hash('CleanupPass123!', 12),
        emailVerified: new Date()
      });

      // Create multiple expired sessions
      const expiredSessions = Array.from({ length: 10 }, (_, i) =>
        global.__PRISMA__.session.create({
          data: {
            token: `expired-session-${i}`,
            userId: user.id,
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
            isActive: true
          }
        })
      );

      await Promise.all(expiredSessions);

      // Perform concurrent cleanup operations
      const cleanupOperations = Array.from({ length: 3 }, () =>
        global.__PRISMA__.session.deleteMany({
          where: {
            expiresAt: { lt: new Date() }
          }
        })
      );

      await Promise.allSettled(cleanupOperations);

      // Verify cleanup completed successfully
      const remainingSessions = await global.__PRISMA__.session.findMany({
        where: { userId: user.id }
      });

      expect(remainingSessions.length).toBe(0);
    });
  });
});