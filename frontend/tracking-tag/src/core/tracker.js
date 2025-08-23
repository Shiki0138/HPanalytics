/**
 * AI Web Analytics Tracker - Core Implementation
 * エンタープライズ級アナリティクストラッカー
 */

import { generateUUID, getCurrentTimestamp } from '../utils/helpers.js';
import { getDeviceInfo } from '../utils/device.js';
import { extractUTMParameters } from '../utils/utm.js';
import { sanitizeData } from '../utils/sanitize.js';
import { Storage } from '../utils/storage.js';
import { WebVitalsCollector } from '../metrics/web-vitals.js';

/**
 * Main Tracker class
 */
export class Tracker {
  constructor() {
    this.eventQueue = [];
    this.storage = new Storage();
    this.state = this.initializeState();
    this.setupEventHandlers();
  }

  /**
   * Initialize tracker with configuration
   * @param {Object} config - Configuration object
   */
  init(config) {
    if (!this.isBrowserEnvironment()) {
      return;
    }

    // Merge default config
    this.state.config = {
      endpoint: '/api/collect',
      sampleRate: 1.0,
      debug: false,
      userProperties: {},
      offlineStorage: true,
      batchSize: 10,
      flushInterval: 5000,
      webVitals: true,
      errorTracking: true,
      cookieConsent: () => true,
      ...config
    };

    // Check consent
    if (!this.state.config.cookieConsent()) {
      return;
    }

    // Apply sampling
    if (Math.random() > this.state.config.sampleRate) {
      return;
    }

    // Initialize components
    this.initializeSession();
    this.loadOfflineEvents();

    if (this.state.config.webVitals) {
      this.initializeWebVitals();
    }

    if (this.state.config.errorTracking) {
      this.initializeErrorTracking();
    }

    this.startPeriodicFlush();
    this.setupSessionTimeout();

    this.state.isInitialized = true;
    this.debug('Tracker initialized');

    // Track initial page view
    this.page();
  }

  /**
   * Track custom event
   * @param {string} eventType - Type of event
   * @param {Object} properties - Event properties
   */
  track(eventType, properties = {}) {
    if (!this.isReady()) {
      return;
    }

    const event = {
      type: eventType,
      timestamp: getCurrentTimestamp(),
      sessionId: this.state.sessionId,
      userId: this.state.userId,
      properties: sanitizeData(properties)
    };

    this.addEvent(event);
    this.updateActivity();
    this.debug('Event tracked:', event);
  }

  /**
   * Track page view
   * @param {string} url - Page URL
   * @param {string} title - Page title
   * @param {Object} properties - Additional properties
   */
  page(url, title, properties = {}) {
    if (!this.isReady()) {
      return;
    }

    const pageUrl = url || (this.isBrowserEnvironment() ? window.location.href : '');
    const pageTitle = title || (this.isBrowserEnvironment() ? document.title : '');
    const referrer = this.isBrowserEnvironment() ? document.referrer : '';

    const event = {
      type: 'pageview',
      timestamp: getCurrentTimestamp(),
      sessionId: this.state.sessionId,
      userId: this.state.userId,
      url: pageUrl,
      title: pageTitle,
      referrer: referrer || undefined,
      utm: extractUTMParameters(pageUrl),
      properties: sanitizeData(properties)
    };

    this.addEvent(event);
    this.updateActivity();
    this.debug('Page view tracked:', event);
  }

  /**
   * Identify user
   * @param {string} userId - User ID
   * @param {Object} properties - User properties
   */
  identify(userId, properties = {}) {
    if (!this.isReady()) {
      return;
    }

    this.state.userId = userId;
    this.storage.setUserId(userId);
    this.setUserProperties(properties);
    this.debug('User identified:', userId);
  }

  /**
   * Set user properties
   * @param {Object} properties - User properties
   */
  setUserProperties(properties) {
    if (!this.isReady()) {
      return;
    }

    const sanitizedProps = sanitizeData(properties);
    this.state.userProperties = {
      ...this.state.userProperties,
      ...sanitizedProps
    };

    this.storage.setUserProperties(this.state.userProperties);
    this.debug('User properties updated:', this.state.userProperties);
  }

  /**
   * Manually flush events to server
   */
  async flush() {
    if (!this.isReady()) {
      return;
    }

    await this.sendEvents();
    this.debug('Events flushed');
  }

  /**
   * Reset tracker state
   */
  reset() {
    this.clearIntervals();
    this.storage.clearSession();
    this.state = this.initializeState();
    this.debug?.('Tracker reset');
  }

  /**
   * Get current session ID
   * @returns {string} Session ID
   */
  getSessionId() {
    return this.state.sessionId;
  }

  /**
   * Get current user ID
   * @returns {string|null} User ID
   */
  getUserId() {
    return this.state.userId || null;
  }

  // ===================
  // Private methods
  // ===================

  /**
   * Initialize tracker state
   * @returns {Object} Initial state
   */
  initializeState() {
    return {
      config: {},
      sessionId: generateUUID(),
      deviceInfo: getDeviceInfo(),
      userProperties: {},
      eventQueue: [],
      isInitialized: false,
      lastActivity: getCurrentTimestamp(),
      pageLoadTime: getCurrentTimestamp()
    };
  }

  /**
   * Check if tracker is ready
   * @returns {boolean} Ready status
   */
  isReady() {
    return this.isBrowserEnvironment() && this.state.isInitialized;
  }

  /**
   * Check if running in browser environment
   * @returns {boolean} Browser environment status
   */
  isBrowserEnvironment() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  /**
   * Initialize session management
   */
  initializeSession() {
    const sessionData = this.storage.getSessionData();
    const currentTime = getCurrentTimestamp();

    // Check if existing session is still valid (30 minutes)
    if (sessionData.sessionId && sessionData.lastActivity && 
        currentTime - sessionData.lastActivity < 30 * 60 * 1000) {
      
      this.state.sessionId = sessionData.sessionId;
      this.state.userId = sessionData.userId;
      this.state.userProperties = sessionData.userProperties;
    } else {
      // Create new session
      this.state.sessionId = generateUUID();
      this.storage.setSessionId(this.state.sessionId);
    }

    this.updateActivity();
  }

  /**
   * Load offline events from storage
   */
  loadOfflineEvents() {
    if (!this.state.config.offlineStorage) {
      return;
    }

    const offlineEvents = this.storage.getEventQueue();
    this.eventQueue = offlineEvents;
    this.debug('Loaded offline events:', offlineEvents.length);
  }

  /**
   * Initialize Web Vitals collection
   */
  initializeWebVitals() {
    this.webVitalsCollector = new WebVitalsCollector();
    
    this.webVitalsCollector.onMetric((metric) => {
      const event = {
        type: 'web-vital',
        timestamp: getCurrentTimestamp(),
        sessionId: this.state.sessionId,
        userId: this.state.userId,
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
        properties: {
          entries: metric.entries.length
        }
      };

      this.addEvent(event);
    });
  }

  /**
   * Initialize error tracking
   */
  initializeErrorTracking() {
    this.errorHandler = (errorEvent) => {
      const event = {
        type: 'error',
        timestamp: getCurrentTimestamp(),
        sessionId: this.state.sessionId,
        userId: this.state.userId,
        message: errorEvent.message || 'Unknown error',
        stack: errorEvent.error?.stack,
        filename: errorEvent.filename,
        lineno: errorEvent.lineno,
        colno: errorEvent.colno
      };

      this.addEvent(event);
    };

    window.addEventListener('error', this.errorHandler);

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorEvent = {
        type: 'error',
        timestamp: getCurrentTimestamp(),
        sessionId: this.state.sessionId,
        userId: this.state.userId,
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        properties: {
          type: 'unhandledrejection'
        }
      };

      this.addEvent(errorEvent);
    });
  }

  /**
   * Setup event handlers for automatic tracking
   */
  setupEventHandlers() {
    if (!this.isBrowserEnvironment()) {
      return;
    }

    // Click tracking with debouncing
    this.clickHandler = this.debounce((event) => {
      if (!this.isReady()) {
        return;
      }

      const target = event.target;
      if (!target) {
        return;
      }

      const clickEvent = {
        type: 'click',
        timestamp: getCurrentTimestamp(),
        sessionId: this.state.sessionId,
        userId: this.state.userId,
        selector: this.getElementSelector(target),
        coordinates: {
          x: event.clientX,
          y: event.clientY
        },
        text: target.textContent?.slice(0, 100) || undefined
      };

      this.addEvent(clickEvent);
      this.updateActivity();
    }, 100);

    document.addEventListener('click', this.clickHandler);

    // Page unload handling
    this.beforeUnloadHandler = () => {
      this.sendBeacon();
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    // Visibility change handling
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.sendBeacon();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  /**
   * Start periodic flush timer
   */
  startPeriodicFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = window.setInterval(() => {
      this.sendEvents().catch(() => {
        // Silent error handling
      });
    }, this.state.config.flushInterval);
  }

  /**
   * Setup session timeout
   */
  setupSessionTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = window.setTimeout(() => {
      // Start new session after 30 minutes of inactivity
      this.state.sessionId = generateUUID();
      this.storage.setSessionId(this.state.sessionId);
      this.debug('New session started due to timeout');
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Add event to queue
   * @param {Object} event - Event object
   */
  addEvent(event) {
    const eventWrapper = {
      event,
      retries: 0,
      timestamp: getCurrentTimestamp()
    };

    this.eventQueue.push(eventWrapper);

    // Store offline if enabled
    if (this.state.config.offlineStorage) {
      this.storage.addToQueue(eventWrapper);
    }

    // Auto-flush if queue is full
    if (this.eventQueue.length >= this.state.config.batchSize) {
      this.sendEvents().catch(() => {
        // Silent error handling
      });
    }
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.state.lastActivity = getCurrentTimestamp();
    this.storage.setLastActivity(this.state.lastActivity);
    this.setupSessionTimeout();
  }

  /**
   * Send events to server
   */
  async sendEvents() {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    const payload = {
      projectId: this.state.config.projectId,
      sessionId: this.state.sessionId,
      userId: this.state.userId,
      userProperties: this.state.userProperties,
      deviceInfo: this.state.deviceInfo,
      events: eventsToSend.map(wrapper => wrapper.event),
      timestamp: getCurrentTimestamp()
    };

    try {
      const response = await fetch(this.state.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Remove successfully sent events
      this.eventQueue = this.eventQueue.filter(wrapper => 
        !eventsToSend.some(sent => sent.timestamp === wrapper.timestamp)
      );

      // Update offline storage
      if (this.state.config.offlineStorage) {
        this.storage.removeFromQueue(eventsToSend);
      }

      this.debug('Events sent successfully:', eventsToSend.length);

    } catch (error) {
      // Handle retry logic
      eventsToSend.forEach(wrapper => {
        wrapper.retries++;
        if (wrapper.retries >= 3) {
          // Remove events that have failed too many times
          const index = this.eventQueue.findIndex(q => q.timestamp === wrapper.timestamp);
          if (index >= 0) {
            this.eventQueue.splice(index, 1);
          }
        }
      });

      this.debug('Failed to send events:', error);
    }
  }

  /**
   * Send events using beacon API for page unload
   */
  sendBeacon() {
    if (this.eventQueue.length === 0) {
      return;
    }

    const payload = {
      projectId: this.state.config.projectId,
      sessionId: this.state.sessionId,
      userId: this.state.userId,
      userProperties: this.state.userProperties,
      deviceInfo: this.state.deviceInfo,
      events: this.eventQueue.map(wrapper => wrapper.event),
      timestamp: getCurrentTimestamp()
    };

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.state.config.endpoint, JSON.stringify(payload));
      } else {
        // Fallback for older browsers
        const xhr = new XMLHttpRequest();
        xhr.open('POST', this.state.config.endpoint, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
      }

      // Clear queue
      this.eventQueue = [];
      if (this.state.config.offlineStorage) {
        this.storage.setEventQueue([]);
      }

    } catch (error) {
      this.debug('Failed to send beacon:', error);
    }
  }

  /**
   * Clear all intervals and timeouts
   */
  clearIntervals() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
  }

  /**
   * Get CSS selector for element
   * @param {Element} element - DOM element
   * @returns {string} CSS selector
   */
  getElementSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.toString().split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    return element.tagName.toLowerCase();
  }

  /**
   * Debounce utility
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      if (!timeout) {
        func(...args);
        timeout = true;
        setTimeout(() => {
          timeout = false;
        }, wait);
      }
    };
  }

  /**
   * Debug logging
   * @param {...any} args - Arguments to log
   */
  debug(...args) {
    if (this.state.config?.debug) {
      console.log('[AI Analytics]', ...args);
    }
  }

  /**
   * Clean up event listeners and timers
   */
  destroy() {
    this.clearIntervals();

    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
    }
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
    }
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }

    this.webVitalsCollector?.destroy();

    // Send remaining events before destroying
    this.sendBeacon();
  }
}