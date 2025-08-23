import { UserRole } from '@prisma/client';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// User types
export interface UserPayload {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Site types
export interface CreateSiteInput {
  domain: string;
  name: string;
  description?: string;
}

export interface UpdateSiteInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface SiteData {
  id: string;
  userId: string;
  domain: string;
  name: string;
  description?: string;
  isActive: boolean;
  trackingId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics types
export interface PageViewData {
  id: string;
  siteId: string;
  sessionId: string;
  url: string;
  path: string;
  title?: string;
  referrer?: string;
  userAgent: string;
  ip: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  duration?: number;
  bounced: boolean;
  createdAt: Date;
}

export interface SessionData {
  id: string;
  siteId: string;
  visitorId: string;
  userAgent: string;
  ip: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  landingPage: string;
  exitPage?: string;
  pageCount: number;
  duration: number;
  bounced: boolean;
  startedAt: Date;
  endedAt?: Date;
}

export interface AnalyticsEvent {
  trackingId: string;
  event: 'pageview' | 'event' | 'session_start' | 'session_end';
  url: string;
  path: string;
  title?: string;
  referrer?: string;
  userAgent: string;
  visitorId?: string;
  sessionId?: string;
  customData?: Record<string, any>;
  timestamp: Date;
}

// Dashboard types
export interface DashboardStats {
  totalPageViews: number;
  totalSessions: number;
  totalUsers: number;
  bounceRate: number;
  avgSessionDuration: number;
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  deviceTypes: DeviceTypeStat[];
}

export interface TopPage {
  path: string;
  title?: string;
  views: number;
  uniqueViews?: number;
}

export interface TopReferrer {
  source: string;
  sessions: number;
  percentage?: number;
}

export interface DeviceTypeStat {
  type: 'desktop' | 'mobile' | 'tablet';
  count: number;
  percentage: number;
}

// Geographic types
export interface CountryStats {
  country: string;
  countryCode: string;
  sessions: number;
  pageViews: number;
  percentage?: number;
}

export interface CityStats {
  city: string;
  country: string;
  sessions: number;
  pageViews: number;
}

// Traffic source types
export interface TrafficSource {
  source: string;
  type: 'search' | 'social' | 'direct' | 'referral' | 'email' | 'campaign';
  sessions: number;
  pageViews: number;
  bounceRate: number;
  avgSessionDuration: number;
}

// Device analytics types
export interface BrowserStats {
  browser: string;
  version: string;
  sessions: number;
  percentage: number;
}

export interface OSStats {
  os: string;
  version: string;
  sessions: number;
  percentage: number;
}

// Real-time analytics types
export interface RealTimeData {
  activeUsers: number;
  currentPageViews: number;
  topActivePages: ActivePage[];
  recentEvents: RecentEvent[];
  trafficSources: RealTimeSource[];
}

export interface ActivePage {
  path: string;
  title?: string;
  activeUsers: number;
}

export interface RecentEvent {
  type: string;
  path: string;
  country?: string;
  timestamp: Date;
}

export interface RealTimeSource {
  source: string;
  activeUsers: number;
}

// AI Insights types
export interface AIInsight {
  type: 'performance' | 'user_behavior' | 'conversion' | 'content' | 'technical';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1
  recommendations: string[];
  data?: Record<string, any>;
}

// Filter types
export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

export interface AnalyticsFilters extends DateRange {
  country?: string;
  deviceType?: string;
  browser?: string;
  source?: string;
  path?: string;
}

// Export types
export interface ExportRequest {
  format: 'csv' | 'json' | 'xlsx';
  type: 'pageviews' | 'sessions' | 'events' | 'all';
  dateRange?: DateRange;
  filters?: AnalyticsFilters;
}

// Admin types
export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalSites: number;
  activeSites: number;
  totalPageViews: number;
  totalSessions: number;
  storageUsed: string;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    storage: ServiceStatus;
    queue: ServiceStatus;
  };
  uptime: number;
  memory: NodeJS.MemoryUsage;
  checkedAt: Date;
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: string;
  usage?: string;
  pending?: number;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

// Rate limit types
export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

// Error types
export interface AppErrorDetails {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  timestamp: string;
  path: string;
  method: string;
}

// Configuration types
export interface SystemSettings {
  maxSitesPerUser: number;
  dataRetentionDays: number;
  enableRegistration: boolean;
  enableGuestMode: boolean;
  analyticsEnabled: boolean;
  maintenanceMode: boolean;
}

// JWT token payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Database query helpers
export interface QueryOptions {
  select?: Record<string, boolean>;
  include?: Record<string, any>;
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
}

// Cache types
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
}

// Webhook types
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  signature?: string;
}