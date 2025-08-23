import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AnyZodObject, ZodError } from 'zod';
import { BadRequestError } from './errorHandler';

// Express-validator middleware
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Execute all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map((error) => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        value: (error as any).value,
      }));

      throw new BadRequestError('Validation failed', formattedErrors);
    }

    next();
  };
};

// Zod validation middleware
export const validateSchema = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Validate request data
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request data with validated data
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        throw new BadRequestError('Validation failed', formattedErrors);
      }
      next(error);
    }
  };
};

// Common validation schemas
import { z } from 'zod';

// Pagination schema
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// ID parameter schema
export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

// Date range schema
export const dateRangeSchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

// Search schema
export const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1).optional(),
    field: z.string().optional(),
  }),
});

// Common validators using express-validator
import { body, param, query } from 'express-validator';

export const validators = {
  // Email validation
  email: body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),

  // Password validation
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  // UUID validation
  uuid: param('id').isUUID().withMessage('Invalid ID format'),

  // CUID validation
  cuid: param('id')
    .matches(/^c[a-z0-9]{24}$/)
    .withMessage('Invalid ID format'),

  // URL validation
  url: body('url').isURL().withMessage('Must be a valid URL'),

  // Domain validation
  domain: body('domain')
    .matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/)
    .withMessage('Must be a valid domain'),

  // Pagination
  pagination: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],

  // Date range
  dateRange: [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  ],

  // Sort
  sort: [
    query('sort').optional().isString().withMessage('Sort field must be a string'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be either asc or desc'),
  ],
};

// Sanitization helpers
export const sanitizers = {
  // Trim and escape strings
  sanitizeString: body('*').trim().escape(),

  // Normalize email
  normalizeEmail: body('email').normalizeEmail(),

  // Convert to lowercase
  toLowerCase: body('*').toLowerCase(),

  // Remove special characters
  alphanumeric: body('*').matches(/^[a-zA-Z0-9]+$/).withMessage('Only alphanumeric characters allowed'),
};