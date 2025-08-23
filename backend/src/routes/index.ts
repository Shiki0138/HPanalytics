import { Router } from 'express';
import { Request, Response } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import siteRoutes from './sites';
import analyticsRoutes from './analytics';
import adminRoutes from './admin';

const router = Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API version info
router.get('/version', (_req: Request, res: Response) => {
  res.status(200).json({
    version: '1.0.0',
    apiVersion: 'v1',
    name: 'AI Web Analytics API',
    description: 'RESTful API for AI-powered web analytics',
    documentation: '/docs',
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/sites', siteRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);

export default router;