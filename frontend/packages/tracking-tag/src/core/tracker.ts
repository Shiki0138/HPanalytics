/**
 * Core tracker implementation
 * High-performance analytics tracking with offline support
 */

import {
  TrackerConfig,
  TrackerState,
  TrackerInstance,
  TrackingEvent,
  PageViewEvent,
  ClickEvent,
  WebVitalEvent,
  ErrorEvent,
  QueuedEvent,
  Metric
} from '../types';
import {
  generateUUID,
  now,
  getDeviceInfo,
  getUtmParams,
  getElementSelector,
  debounce,
  throttle,
  isBrowser,
  getCookie,
  setCookie,
  sanitizeObject
} from '../utils';
import { StorageManager } from '../utils/storage';
import { WebVitalsCollector } from '../collectors/webVitals';

/**
 * Main tracker class
 */
export class Tracker implements TrackerInstance {
  private _state: TrackerState;
  private _storage: StorageManager;
  private _webVitals?: WebVitalsCollector;
  private _sendQueue: QueuedEvent[] = [];
  private _flushTimer?: number;
  private _sessionTimer?: number;
  private _clickHandler?: (event: MouseEvent) => void;
  private _errorHandler?: (event: any) => void;
  private _unloadHandler?: () => void;
  private _visibilityHandler?: () => void;

  constructor() {
    this._storage = new StorageManager();
    this._state = this._createInitialState();
    this._setupEventListeners();
  }

  /**
   * Initialize the tracker with configuration
   */
  init(config: TrackerConfig): void {
    if (!isBrowser()) {
      console.warn('AI Analytics: Tracker can only be initialized in browser environment');
      return;
    }

    // Merge with default config
    const defaultConfig = {
      endpoint: '/api/collect',
      sampleRate: 1.0,
      debug: false,
      userProperties: {},
      offlineStorage: true,
      batchSize: 10,
      flushInterval: 5000,
      webVitals: true,
      errorTracking: true,
      cookieConsent: () => true
    };

    this._state.config = { ...defaultConfig, ...config } as TrackerConfig;

    // Check cookie consent
    if (!this._state.config.cookieConsent?.()) {
      console.info('AI Analytics: Cookie consent not provided, limited functionality');
      return;
    }

    // Apply sample rate
    if (Math.random() > this._state.config.sampleRate) {
      console.info('AI Analytics: Not sampled, tracking disabled');
      return;
    }

    // Initialize session
    this._initializeSession();

    // Load persisted data
    this._loadPersistedData();

    // Initialize Web Vitals if enabled
    if (this._state.config.webVitals) {
      this._initializeWebVitals();
    }

    // Setup error tracking if enabled
    if (this._state.config.errorTracking) {
      this._setupErrorTracking();
    }

    // Setup flush timer
    this._setupFlushTimer();

    // Setup session timeout
    this._setupSessionTimeout();

    this._state.isInitialized = true;

    if (this._state.config.debug) {
      console.log('AI Analytics: Tracker initialized', {
        projectId: this._state.config.projectId,
        sessionId: this._state.sessionId,
        storageType: this._storage.getStorageType()
      });
    }

    // Track initial page view
    this.page();
  }

  /**
   * Track a custom event
   */
  track(eventType: string, properties: Record<string, any> = {}): void {
    if (!this._isReady()) return;

    const event: TrackingEvent = {
      type: eventType,
      timestamp: now(),
      sessionId: this._state.sessionId,
      userId: this._state.userId,
      properties: sanitizeObject(properties)
    };

    this._addToQueue(event);
    this._updateLastActivity();

    if (this._state.config.debug) {
      console.log('AI Analytics: Event tracked', { type: eventType, properties });
    }
  }

  /**
   * Track page view
   */
  page(url?: string, title?: string, properties: Record<string, any> = {}): void {
    if (!this._isReady()) return;

    const currentUrl = url || (isBrowser() ? window.location.href : '');
    const currentTitle = title || (isBrowser() ? document.title : '');
    const referrer = isBrowser() ? document.referrer : '';

    const event: PageViewEvent = {
      type: 'pageview',
      timestamp: now(),
      sessionId: this._state.sessionId,
      userId: this._state.userId,
      url: currentUrl,
      title: currentTitle,
      referrer: referrer || undefined,
      utm: getUtmParams(currentUrl),
      properties: sanitizeObject(properties)
    };

    this._addToQueue(event);
    this._updateLastActivity();

    if (this._state.config.debug) {
      console.log('AI Analytics: Page view tracked', { url: currentUrl, title: currentTitle });
    }
  }

  /**
   * Identify user
   */
  identify(userId: string, properties: Record<string, any> = {}): void {
    if (!this._isReady()) return;

    this._state.userId = userId;
    this._storage.setUserId(userId);

    this.setUserProperties(properties);

    if (this._state.config.debug) {
      console.log('AI Analytics: User identified', { userId, properties });
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    if (!this._isReady()) return;

    const sanitized = sanitizeObject(properties);
    this._state.userProperties = { ...this._state.userProperties, ...sanitized };
    this._storage.setUserProperties(this._state.userProperties);

    if (this._state.config.debug) {
      console.log('AI Analytics: User properties set', sanitized);
    }
  }

  /**
   * Force flush events
   */
  async flush(): Promise<void> {
    if (!this._isReady()) return;

    await this._flushEvents();

    if (this._state.config.debug) {
      console.log('AI Analytics: Events flushed');
    }
  }

  /**
   * Reset tracker state
   */
  reset(): void {
    // Clear timers
    if (this._flushTimer) clearInterval(this._flushTimer);
    if (this._sessionTimer) clearTimeout(this._sessionTimer);

    // Clear storage
    this._storage.clearSession();

    // Reset state
    this._state = this._createInitialState();

    if (this._state.config?.debug) {
      console.log('AI Analytics: Tracker reset');
    }
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this._state.sessionId;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this._state.userId || null;
  }

  /**
   * Create initial state
   */
  private _createInitialState(): TrackerState {
    return {
      config: {} as TrackerConfig,
      sessionId: generateUUID(),
      deviceInfo: getDeviceInfo(),
      userProperties: {},
      eventQueue: [],
      isInitialized: false,
      lastActivity: now(),
      pageLoadTime: now()
    };
  }

  /**
   * Check if tracker is ready
   */
  private _isReady(): boolean {
    if (!isBrowser()) return false;
    if (!this._state.isInitialized) {
      console.warn('AI Analytics: Tracker not initialized. Call init() first.');
      return false;
    }
    return true;
  }

  /**
   * Initialize session
   */
  private _initializeSession(): void {
    const sessionData = this._storage.getSessionData();
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    const currentTime = now();

    // Check if existing session is still valid
    if (
      sessionData.sessionId &&
      sessionData.lastActivity &&
      currentTime - sessionData.lastActivity < sessionTimeout
    ) {
      this._state.sessionId = sessionData.sessionId;
      this._state.userId = sessionData.userId;
      this._state.userProperties = sessionData.userProperties;
    } else {
      // Create new session
      this._state.sessionId = generateUUID();
      this._storage.setSessionId(this._state.sessionId);
    }

    this._updateLastActivity();
  }

  /**
   * Load persisted data from storage
   */
  private _loadPersistedData(): void {
    if (!this._state.config.offlineStorage) return;

    const queuedEvents = this._storage.getEventQueue();
    this._sendQueue = queuedEvents;

    if (this._state.config.debug && queuedEvents.length > 0) {
      console.log(`AI Analytics: Loaded ${queuedEvents.length} queued events from storage`);
    }
  }

  /**
   * Initialize Web Vitals collection
   */
  private _initializeWebVitals(): void {
    this._webVitals = new WebVitalsCollector();
    
    this._webVitals.onMetric((metric: Metric) => {
      const event: WebVitalEvent = {
        type: 'web-vital',
        timestamp: now(),
        sessionId: this._state.sessionId,
        userId: this._state.userId,
        name: metric.name as any,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        properties: {
          entries: metric.entries.length
        }
      };

      this._addToQueue(event);
    });
  }

  /**
   * Setup error tracking
   */
  private _setupErrorTracking(): void {
    this._errorHandler = (errorEvent: any) => {
      const event: ErrorEvent = {
        type: 'error',
        timestamp: now(),
        sessionId: this._state.sessionId,
        userId: this._state.userId,
        message: errorEvent.message || 'Unknown error',
        stack: errorEvent.error?.stack,
        filename: errorEvent.filename,
        lineno: errorEvent.lineno,
        colno: errorEvent.colno
      };

      this._addToQueue(event);
    };

    window.addEventListener('error', this._errorHandler);
    
    // Also track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorEvent: ErrorEvent = {
        type: 'error',
        timestamp: now(),
        sessionId: this._state.sessionId,
        userId: this._state.userId,
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        properties: {
          type: 'unhandledrejection'
        }
      };

      this._addToQueue(errorEvent);
    });
  }

  /**
   * Setup event listeners
   */
  private _setupEventListeners(): void {
    if (!isBrowser()) return;

    // Click tracking (throttled for performance)
    this._clickHandler = throttle((event: MouseEvent) => {
      if (!this._isReady()) return;

      const target = event.target as Element;
      if (!target) return;

      const clickEvent: ClickEvent = {
        type: 'click',
        timestamp: now(),
        sessionId: this._state.sessionId,
        userId: this._state.userId,
        selector: getElementSelector(target),
        coordinates: { x: event.clientX, y: event.clientY },
        text: target.textContent?.slice(0, 100) || undefined
      };

      this._addToQueue(clickEvent);
      this._updateLastActivity();
    }, 100);

    document.addEventListener('click', this._clickHandler);

    // Page unload - flush events
    this._unloadHandler = () => {
      this._flushEventsSync();
    };

    window.addEventListener('beforeunload', this._unloadHandler);

    // Visibility change - flush events when hidden
    this._visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this._flushEventsSync();
      }
    };

    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  /**
   * Setup flush timer
   */
  private _setupFlushTimer(): void {
    if (this._flushTimer) clearInterval(this._flushTimer);

    this._flushTimer = window.setInterval(() => {
      this._flushEvents().catch(() => {
        // Ignore flush errors
      });
    }, this._state.config.flushInterval);
  }

  /**
   * Setup session timeout
   */
  private _setupSessionTimeout(): void {
    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    
    if (this._sessionTimer) clearTimeout(this._sessionTimer);

    this._sessionTimer = window.setTimeout(() => {
      // Session expired, create new session for future events
      this._state.sessionId = generateUUID();
      this._storage.setSessionId(this._state.sessionId);
      
      if (this._state.config.debug) {
        console.log('AI Analytics: Session expired, created new session');
      }
    }, sessionTimeout);
  }

  /**
   * Add event to queue
   */
  private _addToQueue(event: TrackingEvent): void {
    const queuedEvent: QueuedEvent = {
      event,
      retries: 0,
      timestamp: now()
    };

    this._sendQueue.push(queuedEvent);

    // Persist to storage if enabled
    if (this._state.config.offlineStorage) {
      this._storage.addToQueue(queuedEvent);
    }

    // Auto flush if batch size reached
    if (this._sendQueue.length >= this._state.config.batchSize) {
      this._flushEvents().catch(() => {
        // Ignore flush errors
      });
    }
  }

  /**
   * Update last activity timestamp
   */
  private _updateLastActivity(): void {
    this._state.lastActivity = now();
    this._storage.setLastActivity(this._state.lastActivity);
    
    // Reset session timeout
    this._setupSessionTimeout();
  }

  /**
   * Flush events asynchronously
   */
  private async _flushEvents(): Promise<void> {
    if (this._sendQueue.length === 0) return;

    const eventsToSend = [...this._sendQueue];
    const payload = {
      projectId: this._state.config.projectId,
      sessionId: this._state.sessionId,
      userId: this._state.userId,
      userProperties: this._state.userProperties,
      deviceInfo: this._state.deviceInfo,
      events: eventsToSend.map(item => item.event),
      timestamp: now()
    };

    try {
      const response = await fetch(this._state.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Success - remove sent events from queue
        this._sendQueue = this._sendQueue.filter(
          item => !eventsToSend.some(sent => sent.timestamp === item.timestamp)
        );

        if (this._state.config.offlineStorage) {
          this._storage.removeFromQueue(eventsToSend);
        }

        if (this._state.config.debug) {
          console.log(`AI Analytics: Sent ${eventsToSend.length} events`);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // Handle retry logic
      eventsToSend.forEach(item => {
        item.retries++;
        if (item.retries >= 3) {
          // Max retries reached, remove from queue
          const index = this._sendQueue.findIndex(q => q.timestamp === item.timestamp);
          if (index >= 0) {
            this._sendQueue.splice(index, 1);
          }
        }
      });

      if (this._state.config.debug) {
        console.warn('AI Analytics: Failed to send events', error);
      }
    }
  }

  /**
   * Synchronous flush for page unload
   */
  private _flushEventsSync(): void {
    if (this._sendQueue.length === 0) return;

    const payload = {
      projectId: this._state.config.projectId,
      sessionId: this._state.sessionId,
      userId: this._state.userId,
      userProperties: this._state.userProperties,
      deviceInfo: this._state.deviceInfo,
      events: this._sendQueue.map(item => item.event),
      timestamp: now()
    };

    try {
      // Use sendBeacon for reliable delivery during page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          this._state.config.endpoint!,
          JSON.stringify(payload)
        );
      } else {
        // Fallback to synchronous XHR
        const xhr = new XMLHttpRequest();
        xhr.open('POST', this._state.config.endpoint!, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
      }

      // Clear queue on successful send
      this._sendQueue = [];
      if (this._state.config.offlineStorage) {
        this._storage.setEventQueue([]);
      }
    } catch (error) {
      if (this._state.config.debug) {
        console.warn('AI Analytics: Failed to send events on unload', error);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear timers
    if (this._flushTimer) clearInterval(this._flushTimer);
    if (this._sessionTimer) clearTimeout(this._sessionTimer);

    // Remove event listeners
    if (this._clickHandler) {
      document.removeEventListener('click', this._clickHandler);
    }
    if (this._errorHandler) {
      window.removeEventListener('error', this._errorHandler);
    }
    if (this._unloadHandler) {
      window.removeEventListener('beforeunload', this._unloadHandler);
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
    }

    // Cleanup Web Vitals
    this._webVitals?.destroy();

    // Final flush
    this._flushEventsSync();
  }
}