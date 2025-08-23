// Security Headers Middleware for HP Analysis System
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');

// Content Security Policy configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Required for some UI libraries
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com"
    ],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for inline scripts (minimize usage)
      "'unsafe-eval'", // Required for some frameworks (avoid if possible)
      "https://cdnjs.cloudflare.com",
      "https://www.googletagmanager.com"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "https://cdnjs.cloudflare.com",
      "data:"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "blob:"
    ],
    connectSrc: [
      "'self'",
      "https://api.hp-analysis.com",
      "wss://api.hp-analysis.com",
      process.env.NODE_ENV === 'development' ? "http://localhost:*" : null
    ].filter(Boolean),
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'"],
    childSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
  },
  reportOnly: false,
  reportUri: '/api/csp-report'
};

// Rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: (req) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/metrics') {
        return true;
      }
      
      // Skip for trusted IP addresses (if configured)
      const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
      if (trustedIPs.includes(req.ip)) {
        return true;
      }
      
      return false;
    }
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests from this IP, please try again later.'
  ),
  
  // Strict rate limit for authentication endpoints
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 requests per windowMs
    'Too many authentication attempts, please try again later.',
    true // skip successful requests
  ),
  
  // API endpoints
  api: createRateLimit(
    1 * 60 * 1000, // 1 minute
    20, // limit each IP to 20 requests per minute
    'API rate limit exceeded, please slow down your requests.'
  ),
  
  // File upload endpoints
  upload: createRateLimit(
    60 * 60 * 1000, // 1 hour
    10, // limit each IP to 10 uploads per hour
    'Upload rate limit exceeded, please try again later.'
  )
};

// Speed limiting (progressive delay)
const speedLimiters = {
  general: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 50 requests per 15 minutes, then...
    delayMs: 500, // begin adding 500ms of delay per request above 50
    maxDelayMs: 20000, // maximum delay of 20 seconds
    skipSuccessfulRequests: true
  }),
  
  api: slowDown({
    windowMs: 1 * 60 * 1000, // 1 minute
    delayAfter: 10, // allow 10 requests per minute, then...
    delayMs: 200, // begin adding 200ms of delay per request above 10
    maxDelayMs: 5000, // maximum delay of 5 seconds
    skipSuccessfulRequests: true
  })
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
      'https://hp-analysis.com',
      'https://www.hp-analysis.com',
      'https://admin.hp-analysis.com'
    ];
    
    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000'
      );
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Client-Version'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
};

// Input validation middleware
const sanitizeInput = [
  body('*').escape().trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Invalid input',
        details: errors.array()
      });
    }
    next();
  }
];

// Custom security middleware
const customSecurityMiddleware = (req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site'
  });
  
  // Security logging
  if (req.headers['x-forwarded-for'] || req.headers['user-agent']) {
    console.log(`Security Log: ${req.method} ${req.path} from ${req.ip} - UA: ${req.headers['user-agent']?.substring(0, 100)}`);
  }
  
  next();
};

// CSP violation report handler
const cspReportHandler = (req, res) => {
  console.error('CSP Violation:', JSON.stringify(req.body, null, 2));
  
  // Log to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring/logging service
    // Example: Sentry, DataDog, etc.
  }
  
  res.status(204).send();
};

// Security audit middleware
const securityAudit = (req, res, next) => {
  // Log suspicious activity
  const suspiciousPatterns = [
    /(\.\.|\/\/|\\\\)/,  // Path traversal
    /(union|select|insert|update|delete|drop|create|alter)/i, // SQL injection
    /(<script|javascript:|on\w+\s*=)/i, // XSS
    /(base64|eval|fromcharcode)/i // Code injection
  ];
  
  const checkString = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      console.warn(`Suspicious request detected from ${req.ip}: ${req.method} ${req.url}`);
      
      // In production, you might want to block such requests
      if (process.env.BLOCK_SUSPICIOUS_REQUESTS === 'true') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Suspicious request detected'
        });
      }
      break;
    }
  }
  
  next();
};

// Main security configuration function
const configureSecurity = (app) => {
  // Basic security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: cspConfig,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));
  
  // Custom security middleware
  app.use(customSecurityMiddleware);
  
  // Security audit
  app.use(securityAudit);
  
  // CSP violation reporting
  app.post('/api/csp-report', express.raw({ type: 'application/csp-report' }), cspReportHandler);
  
  return {
    rateLimiters,
    speedLimiters,
    corsOptions,
    sanitizeInput
  };
};

module.exports = {
  configureSecurity,
  rateLimiters,
  speedLimiters,
  corsOptions,
  sanitizeInput,
  customSecurityMiddleware,
  securityAudit,
  cspReportHandler
};