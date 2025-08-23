import { Router } from 'express';
import { authenticate, requireSiteOwnership } from '../middleware/auth';
import { userRateLimit, endpointRateLimits } from '../middleware/rateLimit';
import { validate, validators } from '../middleware/validation';
import { body, param } from 'express-validator';

const router = Router();

// Apply authentication to all site routes
router.use(authenticate);
router.use(userRateLimit);

// Validation rules
const createSiteValidation = [
  body('domain')
    .matches(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/)
    .withMessage('Must be a valid domain'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
];

const updateSiteValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// Routes

// Get all user sites
router.get(
  '/',
  validate(validators.pagination),
  async (req, res, next) => {
    try {
      // TODO: Fetch user sites from database
      res.status(200).json({
        sites: [
          {
            id: 'site-1',
            domain: 'example.com',
            name: 'Example Site',
            description: 'My example website',
            isActive: true,
            trackingId: 'tracking-123',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        pagination: {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 10,
          total: 1,
          pages: 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create new site
router.post(
  '/',
  endpointRateLimits.siteCreation,
  validate(createSiteValidation),
  async (req, res, next) => {
    try {
      // TODO: Create site in database
      const siteData = {
        id: 'new-site-id',
        userId: req.user!.id,
        domain: req.body.domain,
        name: req.body.name,
        description: req.body.description,
        isActive: true,
        trackingId: `track_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      res.status(201).json({
        message: 'Site created successfully',
        site: siteData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get site by ID
router.get(
  '/:id',
  param('id').isString().notEmpty(),
  requireSiteOwnership,
  async (req, res, next) => {
    try {
      // TODO: Fetch site by ID
      res.status(200).json({
        site: {
          id: req.params.id,
          domain: 'example.com',
          name: 'Example Site',
          description: 'My example website',
          isActive: true,
          trackingId: 'tracking-123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update site
router.put(
  '/:id',
  param('id').isString().notEmpty(),
  requireSiteOwnership,
  validate(updateSiteValidation),
  async (req, res, next) => {
    try {
      // TODO: Update site in database
      res.status(200).json({
        message: 'Site updated successfully',
        site: {
          id: req.params.id,
          ...req.body,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete site
router.delete(
  '/:id',
  param('id').isString().notEmpty(),
  requireSiteOwnership,
  async (req, res, next) => {
    try {
      // TODO: Delete site from database
      res.status(200).json({
        message: 'Site deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get site tracking code
router.get(
  '/:id/tracking-code',
  param('id').isString().notEmpty(),
  requireSiteOwnership,
  async (req, res, next) => {
    try {
      const trackingId = 'tracking-123'; // TODO: Get from database
      
      const trackingCode = `
<!-- AI Web Analytics Tracking Code -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://analytics.example.com/track.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${trackingId}');
</script>
<!-- End AI Web Analytics Tracking Code -->`.trim();

      res.status(200).json({
        trackingId,
        trackingCode,
        instructions: [
          'Copy the tracking code above',
          'Paste it in the <head> section of your website',
          'The code will start collecting data immediately',
        ],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Regenerate tracking ID
router.post(
  '/:id/regenerate-tracking',
  param('id').isString().notEmpty(),
  requireSiteOwnership,
  async (req, res, next) => {
    try {
      // TODO: Regenerate tracking ID in database
      const newTrackingId = `track_${Date.now()}`;
      
      res.status(200).json({
        message: 'Tracking ID regenerated successfully',
        trackingId: newTrackingId,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get site verification status
router.get(
  '/:id/verification',
  param('id').isString().notEmpty(),
  requireSiteOwnership,
  async (req, res, next) => {
    try {
      // TODO: Check if site is receiving data
      res.status(200).json({
        verified: true,
        lastDataReceived: new Date().toISOString(),
        totalPageViews: 1234,
        totalSessions: 567,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify site setup
router.post(
  '/:id/verify',
  param('id').isString().notEmpty(),
  requireSiteOwnership,
  async (req, res, next) => {
    try {
      // TODO: Manually trigger verification check
      res.status(200).json({
        message: 'Site verification check initiated',
        verified: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;