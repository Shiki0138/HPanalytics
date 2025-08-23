/**
 * Data Collection API Endpoint
 * High-performance analytics data collection with validation and security
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Request validation schema
interface CollectRequest {
  projectId: string;
  sessionId: string;
  userId?: string;
  userProperties?: Record<string, any>;
  deviceInfo: {
    userAgent: string;
    screenResolution: string;
    viewportSize: string;
    devicePixelRatio: number;
    language: string;
    timezone: string;
    connectionType?: string;
    isMobile: boolean;
    isTouch: boolean;
  };
  events: Array<{
    type: string;
    timestamp: number;
    sessionId: string;
    userId?: string;
    properties?: Record<string, any>;
    [key: string]: any;
  }>;
  timestamp: number;
}

// Configuration
const CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  maxEventsPerRequest: 100,
  maxEventAge: 24 * 60 * 60 * 1000, // 24 hours
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMaxRequests: 100,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  botUserAgents: [
    'bot', 'crawler', 'spider', 'scraper', 'headless',
    'googlebot', 'bingbot', 'facebookexternalhit'
  ],
};

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  
  return realIP || request.ip || 'unknown';
}

/**
 * Check rate limiting
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const key = `rate_limit:${ip}`;
  
  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k);
    }
  }
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + CONFIG.rateLimitWindow
    });
    return true;
  }
  
  if (current.count >= CONFIG.rateLimitMaxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

/**
 * Validate request origin
 */
function validateOrigin(origin: string | null): boolean {
  if (CONFIG.allowedOrigins.includes('*')) return true;
  if (!origin) return false;
  
  return CONFIG.allowedOrigins.some(allowed => {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(`.${domain}`) || origin === domain;
    }
    return origin === allowed;
  });
}

/**
 * Check if request is from a bot
 */
function isBotRequest(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return CONFIG.botUserAgents.some(bot => ua.includes(bot));
}

/**
 * Validate and sanitize request data
 */
function validateRequest(data: any): { isValid: boolean; errors: string[]; sanitized?: CollectRequest } {
  const errors: string[] = [];
  
  // Basic structure validation
  if (!data || typeof data !== 'object') {
    errors.push('Invalid request format');
    return { isValid: false, errors };
  }
  
  // Required fields
  if (!data.projectId || typeof data.projectId !== 'string') {
    errors.push('projectId is required and must be a string');
  }
  
  if (!data.sessionId || typeof data.sessionId !== 'string') {
    errors.push('sessionId is required and must be a string');
  }
  
  if (!data.events || !Array.isArray(data.events)) {
    errors.push('events is required and must be an array');
  }
  
  if (!data.deviceInfo || typeof data.deviceInfo !== 'object') {
    errors.push('deviceInfo is required and must be an object');
  }
  
  if (!data.timestamp || typeof data.timestamp !== 'number') {
    errors.push('timestamp is required and must be a number');
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Validate events array
  if (data.events.length > CONFIG.maxEventsPerRequest) {
    errors.push(`Too many events (max: ${CONFIG.maxEventsPerRequest})`);
  }
  
  const now = Date.now();
  const validEvents = data.events.filter((event: any) => {
    // Basic event validation
    if (!event || typeof event !== 'object') return false;
    if (!event.type || typeof event.type !== 'string') return false;
    if (!event.timestamp || typeof event.timestamp !== 'number') return false;
    if (!event.sessionId || typeof event.sessionId !== 'string') return false;
    
    // Check event age
    if (now - event.timestamp > CONFIG.maxEventAge) return false;
    
    return true;
  });
  
  if (validEvents.length === 0) {
    errors.push('No valid events found');
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  // Sanitize data
  const sanitized: CollectRequest = {
    projectId: data.projectId.toString().slice(0, 100),
    sessionId: data.sessionId.toString().slice(0, 100),
    userId: data.userId ? data.userId.toString().slice(0, 100) : undefined,
    userProperties: sanitizeObject(data.userProperties),
    deviceInfo: {
      userAgent: (data.deviceInfo.userAgent || '').toString().slice(0, 500),
      screenResolution: (data.deviceInfo.screenResolution || '').toString().slice(0, 20),
      viewportSize: (data.deviceInfo.viewportSize || '').toString().slice(0, 20),
      devicePixelRatio: Number(data.deviceInfo.devicePixelRatio) || 1,
      language: (data.deviceInfo.language || '').toString().slice(0, 10),
      timezone: (data.deviceInfo.timezone || '').toString().slice(0, 50),
      connectionType: data.deviceInfo.connectionType ? data.deviceInfo.connectionType.toString().slice(0, 20) : undefined,
      isMobile: Boolean(data.deviceInfo.isMobile),
      isTouch: Boolean(data.deviceInfo.isTouch),
    },
    events: validEvents.map(sanitizeEvent),
    timestamp: data.timestamp
  };
  
  return { isValid: true, errors: [], sanitized };
}

/**
 * Sanitize object properties
 */
function sanitizeObject(obj: any, maxDepth = 3): Record<string, any> {
  if (!obj || typeof obj !== 'object' || maxDepth <= 0) return {};
  
  const result: Record<string, any> = {};
  let count = 0;
  
  for (const [key, value] of Object.entries(obj)) {
    if (count >= 50) break; // Limit object size
    
    const sanitizedKey = key.toString().slice(0, 100);
    
    if (value === null || value === undefined) {
      result[sanitizedKey] = value;
    } else if (typeof value === 'string') {
      result[sanitizedKey] = value.slice(0, 1000);
    } else if (typeof value === 'number') {
      result[sanitizedKey] = Number.isFinite(value) ? value : 0;
    } else if (typeof value === 'boolean') {
      result[sanitizedKey] = value;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      result[sanitizedKey] = sanitizeObject(value, maxDepth - 1);
    } else if (Array.isArray(value)) {
      result[sanitizedKey] = value.slice(0, 100).map(item => 
        typeof item === 'object' ? sanitizeObject(item, maxDepth - 1) : item
      );
    } else {
      result[sanitizedKey] = String(value).slice(0, 1000);
    }
    
    count++;
  }
  
  return result;
}

/**
 * Sanitize event data
 */
function sanitizeEvent(event: any): any {
  return {
    type: event.type.toString().slice(0, 50),
    timestamp: event.timestamp,
    sessionId: event.sessionId.toString().slice(0, 100),
    userId: event.userId ? event.userId.toString().slice(0, 100) : undefined,
    properties: sanitizeObject(event.properties),
    // Copy other event-specific fields
    ...Object.fromEntries(
      Object.entries(event).filter(([key]) => 
        !['type', 'timestamp', 'sessionId', 'userId', 'properties'].includes(key)
      ).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.slice(0, 1000) : value
      ])
    )
  };
}

/**
 * Process and store analytics data
 */
async function processAnalyticsData(data: CollectRequest, metadata: {
  ip: string;
  userAgent: string;
  referer?: string;
}): Promise<void> {
  // In a real implementation, you would:
  // 1. Store data in a high-performance database (ClickHouse, BigQuery, etc.)
  // 2. Send to real-time processing pipeline (Kafka, PubSub, etc.)
  // 3. Update aggregation tables
  // 4. Trigger alerts if needed
  
  const enrichedData = {
    ...data,
    metadata: {
      ip: metadata.ip,
      userAgent: metadata.userAgent,
      referer: metadata.referer,
      receivedAt: new Date().toISOString(),
      processingTime: Date.now()
    }
  };
  
  // Log for debugging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics data received:', {
      projectId: data.projectId,
      sessionId: data.sessionId,
      eventCount: data.events.length,
      eventTypes: [...new Set(data.events.map(e => e.type))]
    });
  }
  
  // TODO: Implement actual data storage and processing
  // Examples:
  // - await clickhouse.insert('analytics_events', enrichedData);
  // - await kafka.send({ topic: 'analytics', value: enrichedData });
  // - await bigquery.insert('analytics.events', enrichedData);
}

/**
 * Handle OPTIONS request for CORS
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  if (!validateOrigin(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Handle POST request for data collection
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // CORS check
    const origin = request.headers.get('origin');
    if (!validateOrigin(origin)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    // Get client information
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || undefined;
    
    // Bot detection
    if (isBotRequest(userAgent)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    // Rate limiting
    if (!checkRateLimit(ip)) {
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      });
    }
    
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new NextResponse('Invalid Content-Type', { status: 400 });
    }
    
    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > CONFIG.maxRequestSize) {
      return new NextResponse('Payload Too Large', { status: 413 });
    }
    
    // Parse request body
    let requestData;
    try {
      const text = await request.text();
      requestData = JSON.parse(text);
    } catch (error) {
      return new NextResponse('Invalid JSON', { status: 400 });
    }
    
    // Validate request data
    const validation = validateRequest(requestData);
    if (!validation.isValid) {
      return new NextResponse(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.errors 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Process analytics data
    await processAnalyticsData(validation.sanitized!, {
      ip,
      userAgent,
      referer
    });
    
    const processingTime = Date.now() - startTime;
    
    // Return success response
    return new NextResponse(JSON.stringify({ 
      success: true, 
      processed: validation.sanitized!.events.length,
      processingTime
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
    
  } catch (error) {
    console.error('Analytics collection error:', error);
    
    return new NextResponse(JSON.stringify({ 
      error: 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle unsupported methods
 */
export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function PUT() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function DELETE() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function PATCH() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}