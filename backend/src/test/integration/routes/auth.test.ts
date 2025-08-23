import request from 'supertest';
import { Express } from 'express';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { TestUtils } from '../../helpers/testUtils';
import { UserRole } from '@prisma/client';

describe('Auth Routes Integration', () => {
  let testUtils: TestUtils;

  beforeEach(async () => {
    testUtils = new TestUtils(global.__PRISMA__);
    await testUtils.cleanupTestData();
  });

  afterAll(async () => {
    await testUtils.cleanupTestData();
  });

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'User registered successfully',
        user: expect.objectContaining({
          id: expect.any(String),
          email: validRegistrationData.email,
          name: validRegistrationData.name
        })
      });
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistrationData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation Error',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Must be a valid email'
          })
        ])
      });
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistrationData,
          password: 'weak'
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
    });

    it('should validate name length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validRegistrationData,
          name: 'A' // Too short
        })
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'name',
            message: 'Name must be between 2 and 100 characters'
          })
        ])
      );
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.details).toHaveLength(3); // email, password, name
    });
  });

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!'
    };

    beforeEach(async () => {
      // Create test user for login tests
      await testUtils.createTestUser({
        email: validLoginData.email,
        password: await bcrypt.hash(validLoginData.password, 12)
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Login successful',
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        },
        user: expect.objectContaining({
          id: expect.any(String),
          email: validLoginData.email
        })
      });
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: validLoginData.password
        })
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Must be a valid email'
          })
        ])
      );
    });

    it('should validate password presence', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validLoginData.email
          // Missing password
        })
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'password',
            message: 'Password is required'
          })
        ])
      );
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should validate refresh token presence', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'refreshToken',
            message: 'Refresh token is required'
          })
        ])
      );
    });

    it('should return success with valid refresh token format', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-format-token' })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Token refreshed successfully',
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Logged out successfully'
      });
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should accept valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Password reset email sent if account exists'
      });
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            message: 'Must be a valid email'
          })
        ])
      );
    });
  });

  describe('POST /api/auth/reset-password', () => {
    const validResetData = {
      token: 'reset-token',
      password: 'NewPassword123!'
    };

    it('should accept valid reset data', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(validResetData)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Password reset successful'
      });
    });

    it('should validate token presence', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ password: validResetData.password })
        .expect(400);

      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'token',
            message: 'Reset token is required'
          })
        ])
      );
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: validResetData.token,
          password: 'weak'
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
    });
  });

  describe('GET /api/auth/verify-email/:token', () => {
    it('should accept verification token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email/verification-token')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Email verified successfully'
      });
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      // Make multiple requests quickly to trigger rate limiting
      const requests = Array.from({ length: 6 }, () =>
        request(app).post('/api/auth/login').send(loginData)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should apply rate limiting to registration endpoint', async () => {
      const registrationData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User'
      };

      // Make multiple requests quickly
      const requests = Array.from({ length: 4 }, (_, i) =>
        request(app).post('/api/auth/register').send({
          ...registrationData,
          email: `test${i}@example.com`
        })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});