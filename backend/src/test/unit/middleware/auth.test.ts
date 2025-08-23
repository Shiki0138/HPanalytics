import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, jwtUtils, requireSiteOwnership } from '../../../middleware/auth';
import { TestUtils } from '../../helpers/testUtils';
import { UnauthorizedError, ForbiddenError } from '../../../middleware/errorHandler';
import { UserRole } from '@prisma/client';

describe('Auth Middleware', () => {
  let testUtils: TestUtils;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    testUtils = new TestUtils(global.__PRISMA__);
    mockReq = {
      headers: {},
      params: {},
      body: {},
      query: {}
    };
    mockRes = testUtils.createMockResponse();
    mockNext = testUtils.createMockNext();
    jest.clearAllMocks();
  });

  describe('jwtUtils', () => {
    const testPayload = {
      userId: '1',
      email: 'test@example.com',
      role: UserRole.USER
    };

    describe('generateAccessToken', () => {
      it('should generate a valid JWT token', () => {
        const token = jwtUtils.generateAccessToken(testPayload);
        expect(token).toBeDefined();
        expect(typeof token).toBe('string');

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        expect(decoded.userId).toBe(testPayload.userId);
        expect(decoded.email).toBe(testPayload.email);
        expect(decoded.role).toBe(testPayload.role);
      });
    });

    describe('verifyAccessToken', () => {
      it('should verify a valid token', () => {
        const token = jwtUtils.generateAccessToken(testPayload);
        const decoded = jwtUtils.verifyAccessToken(token);
        
        expect(decoded.userId).toBe(testPayload.userId);
        expect(decoded.email).toBe(testPayload.email);
        expect(decoded.role).toBe(testPayload.role);
      });

      it('should throw error for invalid token', () => {
        expect(() => {
          jwtUtils.verifyAccessToken('invalid-token');
        }).toThrow();
      });
    });

    describe('extractTokenFromHeader', () => {
      it('should extract token from Bearer header', () => {
        const token = 'valid-token';
        const authHeader = `Bearer ${token}`;
        const extracted = jwtUtils.extractTokenFromHeader(authHeader);
        
        expect(extracted).toBe(token);
      });

      it('should return null for invalid header format', () => {
        expect(jwtUtils.extractTokenFromHeader('InvalidFormat token')).toBeNull();
        expect(jwtUtils.extractTokenFromHeader('Bearer')).toBeNull();
        expect(jwtUtils.extractTokenFromHeader('')).toBeNull();
        expect(jwtUtils.extractTokenFromHeader(undefined)).toBeNull();
      });
    });
  });

  describe('authenticate middleware', () => {
    it('should authenticate valid user', async () => {
      const user = await testUtils.createTestUser();
      const token = testUtils.generateJWT(Number(user.id), user.role);
      
      mockReq.headers = {
        authorization: `Bearer ${token}`
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe(user.id);
      expect(mockReq.user?.email).toBe(user.email);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(mockReq.user).toBeUndefined();
    });

    it('should reject invalid token', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token'
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(mockReq.user).toBeUndefined();
    });

    it('should reject token for non-existent user', async () => {
      const token = testUtils.generateJWT(99999, 'USER'); // Non-existent user ID
      
      mockReq.headers = {
        authorization: `Bearer ${token}`
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(mockReq.user).toBeUndefined();
    });

    it('should reject inactive user', async () => {
      const user = await testUtils.createTestUser({ isActive: false });
      const token = testUtils.generateJWT(Number(user.id), user.role);
      
      mockReq.headers = {
        authorization: `Bearer ${token}`
      };

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect(mockReq.user).toBeUndefined();
    });
  });

  describe('authorize middleware', () => {
    it('should allow access for authorized role', async () => {
      const user = await testUtils.createTestUser({ role: UserRole.ADMIN });
      mockReq.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: true
      };

      const middleware = authorize(UserRole.ADMIN, UserRole.USER);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access for unauthorized role', async () => {
      const user = await testUtils.createTestUser({ role: UserRole.USER });
      mockReq.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: true
      };

      const middleware = authorize(UserRole.ADMIN);
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(ForbiddenError);
    });

    it('should require authentication', async () => {
      const middleware = authorize(UserRole.USER);
      
      expect(() => {
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }).toThrow(UnauthorizedError);
    });
  });

  describe('requireSiteOwnership middleware', () => {
    it('should allow site owner access', async () => {
      const user = await testUtils.createTestUser();
      const site = await testUtils.createTestSite(Number(user.id));
      
      mockReq.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: true
      };
      mockReq.params = { siteId: site.id };

      await requireSiteOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should allow admin access to any site', async () => {
      const user = await testUtils.createTestUser();
      const admin = await testUtils.createTestAdmin();
      const site = await testUtils.createTestSite(Number(user.id));
      
      mockReq.user = {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        isActive: true
      };
      mockReq.params = { siteId: site.id };

      await requireSiteOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access to non-owner user', async () => {
      const user1 = await testUtils.createTestUser();
      const user2 = await testUtils.createTestUser({
        email: 'user2@example.com'
      });
      const site = await testUtils.createTestSite(Number(user1.id));
      
      mockReq.user = {
        id: user2.id,
        email: user2.email,
        role: user2.role,
        isActive: true
      };
      mockReq.params = { siteId: site.id };

      await requireSiteOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should require authentication', async () => {
      mockReq.params = { siteId: 'some-site-id' };

      await requireSiteOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should require site ID', async () => {
      const user = await testUtils.createTestUser();
      mockReq.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: true
      };

      await requireSiteOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});