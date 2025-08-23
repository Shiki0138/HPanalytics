import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { authConfig } from '../config';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import prisma from '../config/database';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth');

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        name?: string;
        isActive: boolean;
      };
    }
  }
}

// JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// JWT utility functions
export const jwtUtils = {
  // Generate access token
  generateAccessToken: (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, authConfig.jwtSecret, {
      expiresIn: authConfig.jwtExpiresIn,
      issuer: 'ai-web-analytics',
      audience: 'ai-web-analytics-client',
    });
  },

  // Generate refresh token
  generateRefreshToken: (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    return jwt.sign(payload, authConfig.jwtRefreshSecret, {
      expiresIn: authConfig.jwtRefreshExpiresIn,
      issuer: 'ai-web-analytics',
      audience: 'ai-web-analytics-client',
    });
  },

  // Verify access token
  verifyAccessToken: (token: string): JWTPayload => {
    return jwt.verify(token, authConfig.jwtSecret, {
      issuer: 'ai-web-analytics',
      audience: 'ai-web-analytics-client',
    }) as JWTPayload;
  },

  // Verify refresh token
  verifyRefreshToken: (token: string): JWTPayload => {
    return jwt.verify(token, authConfig.jwtRefreshSecret, {
      issuer: 'ai-web-analytics',
      audience: 'ai-web-analytics-client',
    }) as JWTPayload;
  },

  // Extract token from header
  extractTokenFromHeader: (authHeader?: string): string | null => {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  },
};

// Authentication middleware
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = jwtUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Verify token
    const payload = jwtUtils.verifyAccessToken(token);

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid token - user not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token:', error.message);
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token');
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

// Optional authentication middleware (doesn't throw if no token)
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = jwtUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = jwtUtils.verifyAccessToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore errors in optional authentication
    logger.debug('Optional authentication failed:', error);
    next();
  }
};

// Authorization middleware factory
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Insufficient permissions. Required roles: ${roles.join(', ')}`);
    }

    next();
  };
};

// Site ownership middleware
export const requireSiteOwnership = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const siteId = req.params.siteId || req.body.siteId || req.query.siteId;
    
    if (!siteId) {
      throw new ForbiddenError('Site ID is required');
    }

    // Check if user owns the site or is admin
    const site = await prisma.site.findFirst({
      where: {
        id: siteId as string,
        ...(req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMIN 
          ? {} 
          : { userId: req.user.id }
        ),
      },
    });

    if (!site) {
      throw new ForbiddenError('Access denied to this site');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting by user
export const userRateLimit = new Map<string, { count: number; resetTime: number }>();

export const rateLimitByUser = (
  maxRequests: number,
  windowMs: number
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const userLimit = userRateLimit.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize counter
      userRateLimit.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      throw new ForbiddenError('Rate limit exceeded');
    }

    // Increment counter
    userLimit.count++;
    next();
  };
};

// Cleanup expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of userRateLimit.entries()) {
    if (now > limit.resetTime) {
      userRateLimit.delete(userId);
    }
  }
}, 60000); // Cleanup every minute