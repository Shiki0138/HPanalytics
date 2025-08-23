import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { userRateLimit } from '../middleware/rateLimit';
import { validate, validators } from '../middleware/validation';
import { body, param } from 'express-validator';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all user routes
router.use(authenticate);
router.use(userRateLimit);

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
];

// Routes

// Get current user profile
router.get('/profile', async (req, res, next) => {
  try {
    // TODO: Fetch user profile from database
    res.status(200).json({
      user: {
        id: req.user!.id,
        email: req.user!.email,
        name: req.user!.name,
        role: req.user!.role,
        isActive: req.user!.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put(
  '/profile',
  validate(updateProfileValidation),
  async (req, res, next) => {
    try {
      // TODO: Update user profile in database
      res.status(200).json({
        message: 'Profile updated successfully',
        user: {
          id: req.user!.id,
          email: req.body.email || req.user!.email,
          name: req.body.name || req.user!.name,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Change password
router.put(
  '/password',
  validate(changePasswordValidation),
  async (req, res, next) => {
    try {
      // TODO: Implement password change logic
      res.status(200).json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete user account
router.delete('/account', async (req, res, next) => {
  try {
    // TODO: Implement account deletion logic
    res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get user preferences
router.get('/preferences', async (req, res, next) => {
  try {
    // TODO: Fetch user preferences
    res.status(200).json({
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update user preferences
router.put('/preferences', async (req, res, next) => {
  try {
    // TODO: Update user preferences
    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences: req.body,
    });
  } catch (error) {
    next(error);
  }
});

// Admin-only routes
router.use(authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN));

// Get all users (admin only)
router.get(
  '/',
  validate(validators.pagination),
  async (req, res, next) => {
    try {
      // TODO: Implement user listing for admins
      res.status(200).json({
        users: [],
        pagination: {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 10,
          total: 0,
          pages: 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get user by ID (admin only)
router.get(
  '/:id',
  param('id').isString().notEmpty(),
  async (req, res, next) => {
    try {
      // TODO: Fetch user by ID
      res.status(200).json({
        user: {
          id: req.params.id,
          email: 'user@example.com',
          name: 'User Name',
          role: 'USER',
          isActive: true,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update user (admin only)
router.put(
  '/:id',
  param('id').isString().notEmpty(),
  body('role').optional().isIn(Object.values(UserRole)),
  body('isActive').optional().isBoolean(),
  async (req, res, next) => {
    try {
      // TODO: Update user by admin
      res.status(200).json({
        message: 'User updated successfully',
        user: {
          id: req.params.id,
          ...req.body,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Deactivate user (admin only)
router.put(
  '/:id/deactivate',
  param('id').isString().notEmpty(),
  async (req, res, next) => {
    try {
      // TODO: Deactivate user
      res.status(200).json({
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reactivate user (admin only)
router.put(
  '/:id/activate',
  param('id').isString().notEmpty(),
  async (req, res, next) => {
    try {
      // TODO: Reactivate user
      res.status(200).json({
        message: 'User activated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;