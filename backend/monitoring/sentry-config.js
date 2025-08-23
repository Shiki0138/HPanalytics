// Sentry Configuration for HP Analysis System
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

// Initialize Sentry
const initSentry = (environment = 'production') => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment,
    
    // Release tracking
    release: process.env.SENTRY_RELEASE || `hp-analysis@${process.env.APP_VERSION || 'unknown'}`,
    
    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Session Replay for frontend errors
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Integrations
    integrations: [
      // HTTP integration for request tracking
      new Sentry.Integrations.Http({ tracing: true }),
      
      // Express integration
      new Sentry.Integrations.Express({ app: undefined }),
      
      // Prisma integration for database monitoring
      new Sentry.Integrations.Prisma({ client: undefined }),
      
      // Profiling
      new ProfilingIntegration(),
      
      // Console integration for console.error tracking
      new Sentry.Integrations.Console(),
      
      // Local variables in stack traces
      new Sentry.Integrations.LocalVariables({
        captureAllExceptions: false,
      }),
    ],
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out non-critical errors in production
      if (environment === 'production') {
        const error = hint.originalException;
        
        // Skip known non-critical errors
        if (error && typeof error.message === 'string') {
          const skipMessages = [
            'Non-Error promise rejection captured',
            'Network request failed',
            'Connection was closed',
            'ECONNRESET',
          ];
          
          if (skipMessages.some(msg => error.message.includes(msg))) {
            return null;
          }
        }
        
        // Skip low-level network errors
        if (event.exception && event.exception.values) {
          const exception = event.exception.values[0];
          if (exception.type === 'NetworkError' || exception.type === 'TimeoutError') {
            return null;
          }
        }
      }
      
      return event;
    },
    
    // Add custom tags
    tags: {
      component: 'backend',
      service: 'hp-analysis-system',
    },
    
    // Custom context
    initialScope: {
      tags: {
        component: 'backend',
        service: 'hp-analysis-system',
        environment,
      },
    },
    
    // Debug mode
    debug: environment === 'development',
    
    // Breadcrumb settings
    maxBreadcrumbs: 50,
    
    // Attach stack traces
    attachStacktrace: true,
    
    // Send default PII
    sendDefaultPii: false,
    
    // Server name
    serverName: process.env.HOSTNAME || 'hp-analysis-backend',
    
    // Transport options
    transportOptions: {
      // Increase timeout for slow networks
      timeout: 10000,
    },
  });
  
  // Set user context
  Sentry.setUser({
    id: 'system',
    username: 'hp-analysis-system',
  });
  
  // Set additional context
  Sentry.setContext('runtime', {
    name: 'node',
    version: process.version,
  });
  
  Sentry.setContext('app', {
    name: 'hp-analysis-system',
    version: process.env.APP_VERSION || 'unknown',
    environment,
  });
  
  console.log(`Sentry initialized for environment: ${environment}`);
};

// Express middleware setup
const setupSentryExpress = (app) => {
  // Request handler must be the first middleware
  app.use(Sentry.Handlers.requestHandler({
    user: ['id', 'username', 'email'],
    request: ['data', 'headers', 'method', 'query_string', 'url'],
    transaction: 'methodPath',
  }));
  
  // Tracing handler
  app.use(Sentry.Handlers.tracingHandler());
  
  return {
    // Error handler must be after all controllers but before error middleware
    errorHandler: Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture 4xx and 5xx errors
        if (error.status >= 400) {
          return true;
        }
        return false;
      },
    }),
  };
};

// Custom error reporting
const reportError = (error, context = {}) => {
  Sentry.withScope((scope) => {
    // Add context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Add fingerprint for similar errors
    if (error.code) {
      scope.setFingerprint([error.code, error.message]);
    }
    
    // Set severity
    if (error.status) {
      if (error.status >= 500) {
        scope.setLevel('error');
      } else if (error.status >= 400) {
        scope.setLevel('warning');
      } else {
        scope.setLevel('info');
      }
    }
    
    Sentry.captureException(error);
  });
};

// Performance monitoring
const startTransaction = (name, op) => {
  return Sentry.startTransaction({
    name,
    op,
    tags: {
      service: 'hp-analysis-system',
    },
  });
};

// Custom metrics
const addBreadcrumb = (message, category = 'custom', level = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

// Health check for Sentry
const checkSentryHealth = async () => {
  try {
    // Send a test event
    const eventId = Sentry.captureMessage('Sentry health check', 'info');
    return { status: 'healthy', eventId };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Flush Sentry events (useful for Lambda or short-lived processes)
const flushSentry = async (timeout = 2000) => {
  try {
    await Sentry.flush(timeout);
    return true;
  } catch (error) {
    console.error('Failed to flush Sentry events:', error);
    return false;
  }
};

module.exports = {
  initSentry,
  setupSentryExpress,
  reportError,
  startTransaction,
  addBreadcrumb,
  checkSentryHealth,
  flushSentry,
  Sentry,
};