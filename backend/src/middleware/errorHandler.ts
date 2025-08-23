import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ValidationError as ExpressValidationError } from 'express-validator';
import { createLogger } from '../utils/logger';
import { serverConfig } from '../config';

const logger = createLogger('error-handler');

// Custom error class
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public code?: string,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

// Common errors
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: any) {
    super(400, message, true, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: any) {
    super(401, message, true, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: any) {
    super(403, message, true, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found', details?: any) {
    super(404, message, true, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: any) {
    super(409, message, true, 'CONFLICT', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Error', details?: any) {
    super(422, message, true, 'VALIDATION_ERROR', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', details?: any) {
    super(500, message, false, 'INTERNAL_SERVER_ERROR', details);
  }
}

// Error response interface
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
    timestamp: string;
    path: string;
    method: string;
  };
}

// Format error response
const formatErrorResponse = (
  error: AppError,
  req: Request
): ErrorResponse => {
  const response: ErrorResponse = {
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
    },
  };

  if (error.details) {
    response.error.details = error.details;
  }

  if (serverConfig.isDevelopment && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};

// Global error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error: AppError;

  // Handle different error types
  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof ZodError) {
    // Handle Zod validation errors
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    error = new ValidationError('Validation failed', details);
  } else if (err.name === 'ValidationError' && Array.isArray((err as any).array)) {
    // Handle express-validator errors
    const details = (err as any).array().map((e: ExpressValidationError) => ({
      field: e.type === 'field' ? (e as any).path : 'unknown',
      message: e.msg,
    }));
    error = new ValidationError('Validation failed', details);
  } else if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  } else if (err.name === 'CastError') {
    error = new BadRequestError('Invalid ID format');
  } else {
    // Unknown errors
    logger.error('Unhandled error:', err);
    error = new InternalServerError(
      serverConfig.isProduction ? 'Something went wrong' : err.message
    );
  }

  // Log error
  if (!error.isOperational) {
    logger.error('Operational error:', {
      error: err,
      request: {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        ip: req.ip,
      },
    });
  }

  // Send error response
  res.status(error.statusCode).json(formatErrorResponse(error, req));
};

// 404 handler
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
};

// Async handler wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};