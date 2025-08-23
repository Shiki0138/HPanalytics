/**
 * Core types for AI Analytics Tracking Tag
 */

// Configuration types
export interface TrackerConfig {
  /** Project ID for analytics */
  projectId: string;
  /** API endpoint for data collection */
  endpoint?: string;
  /** Sample rate (0-1) for performance optimization */
  sampleRate?: number;
  /** Enable debug mode */
  debug?: boolean;
  /** Custom user properties */
  userProperties?: Record<string, any>;
  /** Enable offline storage */
  offlineStorage?: boolean;
  /** Batch size for event collection */
  batchSize?: number;
  /** Flush interval in milliseconds */
  flushInterval?: number;
  /** Enable Web Vitals tracking */
  webVitals?: boolean;
  /** Enable error tracking */
  errorTracking?: boolean;
  /** Custom domain for cookies */
  cookieDomain?: string;
  /** Cookie consent callback */
  cookieConsent?: () => boolean;
}

// Event types
export interface BaseEvent {
  /** Event type identifier */
  type: string;
  /** Event timestamp */
  timestamp: number;
  /** Session ID */
  sessionId: string;
  /** User ID (if available) */
  userId?: string;
  /** Custom event properties */
  properties?: Record<string, any>;
}

export interface PageViewEvent extends BaseEvent {
  type: 'pageview';
  /** Page URL */
  url: string;
  /** Page title */
  title: string;
  /** Referrer URL */
  referrer?: string;
  /** UTM parameters */
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
}

export interface ClickEvent extends BaseEvent {
  type: 'click';
  /** Element selector */
  selector: string;
  /** Click coordinates */
  coordinates: {
    x: number;
    y: number;
  };
  /** Element text content */
  text?: string;
}

export interface WebVitalEvent extends BaseEvent {
  type: 'web-vital';
  /** Metric name (CLS, FCP, FID, LCP, TTFB) */
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB';
  /** Metric value */
  value: number;
  /** Metric rating */
  rating: 'good' | 'needs-improvement' | 'poor';
  /** Navigation type */
  navigationType?: string;
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  /** Error message */
  message: string;
  /** Error stack trace */
  stack?: string;
  /** Source file */
  filename?: string;
  /** Line number */
  lineno?: number;
  /** Column number */
  colno?: number;
}

export interface CustomEvent extends BaseEvent {
  type: string;
}

export type TrackingEvent = PageViewEvent | ClickEvent | WebVitalEvent | ErrorEvent | CustomEvent;

// Device and browser information
export interface DeviceInfo {
  /** User agent string */
  userAgent: string;
  /** Screen resolution */
  screenResolution: string;
  /** Viewport size */
  viewportSize: string;
  /** Device pixel ratio */
  devicePixelRatio: number;
  /** Language */
  language: string;
  /** Timezone */
  timezone: string;
  /** Connection type */
  connectionType?: string;
  /** Is mobile device */
  isMobile: boolean;
  /** Is touch device */
  isTouch: boolean;
}

// Storage interface
export interface StorageInterface {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

// Event queue item
export interface QueuedEvent {
  event: TrackingEvent;
  retries: number;
  timestamp: number;
}

// Tracker instance interface
export interface TrackerInstance {
  /** Initialize the tracker */
  init(config: TrackerConfig): void;
  /** Track a custom event */
  track(eventType: string, properties?: Record<string, any>): void;
  /** Track page view */
  page(url?: string, title?: string, properties?: Record<string, any>): void;
  /** Set user ID */
  identify(userId: string, properties?: Record<string, any>): void;
  /** Set user properties */
  setUserProperties(properties: Record<string, any>): void;
  /** Force flush events */
  flush(): Promise<void>;
  /** Reset tracker state */
  reset(): void;
  /** Get current session ID */
  getSessionId(): string;
  /** Get current user ID */
  getUserId(): string | null;
}

// Internal tracker state
export interface TrackerState {
  config: TrackerConfig;
  sessionId: string;
  userId?: string;
  deviceInfo: DeviceInfo;
  userProperties: Record<string, any>;
  eventQueue: QueuedEvent[];
  isInitialized: boolean;
  lastActivity: number;
  pageLoadTime: number;
}

// Web Vitals metric
export interface Metric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  entries: PerformanceEntry[];
  navigationType: string;
}