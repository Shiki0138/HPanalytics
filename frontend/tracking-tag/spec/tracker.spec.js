/**
 * Unit tests for AI Web Analytics Tracker
 */

import { Tracker } from '../src/core/tracker.js';

describe('AI Web Analytics Tracker', () => {
  let tracker;
  let mockFetch;
  let mockLocalStorage;
  let mockSessionStorage;

  beforeEach(() => {
    // Reset DOM and globals
    document.body.innerHTML = '';
    
    // Mock fetch
    mockFetch = jasmine.createSpy('fetch').and.returnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      })
    );
    global.fetch = mockFetch;

    // Mock localStorage and sessionStorage
    mockLocalStorage = {
      data: {},
      setItem(key, value) {
        this.data[key] = value;
      },
      getItem(key) {
        return this.data[key] || null;
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      }
    };

    mockSessionStorage = {
      data: {},
      setItem(key, value) {
        this.data[key] = value;
      },
      getItem(key) {
        return this.data[key] || null;
      },
      removeItem(key) {
        delete this.data[key];
      },
      clear() {
        this.data = {};
      }
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });

    // Mock performance API
    if (!window.performance) {
      window.performance = {
        now: () => Date.now(),
        timeOrigin: Date.now()
      };
    }

    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Test User Agent',
        language: 'en-US',
        sendBeacon: jasmine.createSpy('sendBeacon').and.returnValue(true)
      },
      writable: true
    });

    // Create fresh tracker instance
    tracker = new Tracker();
  });

  afterEach(() => {
    if (tracker) {
      tracker.destroy();
    }
    jasmine.clock().uninstall();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const config = {
        endpoint: '/api/test',
        projectId: 'test-project'
      };

      tracker.init(config);

      expect(tracker.state.isInitialized).toBe(true);
      expect(tracker.state.config.endpoint).toBe('/api/test');
      expect(tracker.state.config.projectId).toBe('test-project');
      expect(tracker.state.sessionId).toBeTruthy();
    });

    it('should respect sampling rate', () => {
      spyOn(Math, 'random').and.returnValue(0.8); // > 0.5 sample rate

      tracker.init({
        sampleRate: 0.5,
        projectId: 'test'
      });

      expect(tracker.state.isInitialized).toBe(false);
    });

    it('should respect cookie consent', () => {
      tracker.init({
        cookieConsent: () => false,
        projectId: 'test'
      });

      expect(tracker.state.isInitialized).toBe(false);
    });

    it('should generate unique session ID', () => {
      tracker.init({ projectId: 'test' });
      const sessionId1 = tracker.getSessionId();

      const tracker2 = new Tracker();
      tracker2.init({ projectId: 'test' });
      const sessionId2 = tracker2.getSessionId();

      expect(sessionId1).not.toBe(sessionId2);
      tracker2.destroy();
    });
  });

  describe('Event Tracking', () => {
    beforeEach(() => {
      tracker.init({
        projectId: 'test-project',
        endpoint: '/api/collect'
      });
    });

    it('should track custom events', () => {
      const eventType = 'button_click';
      const properties = { button_id: 'test-button' };

      tracker.track(eventType, properties);

      expect(tracker.eventQueue.length).toBe(1);
      expect(tracker.eventQueue[0].event.type).toBe(eventType);
      expect(tracker.eventQueue[0].event.properties.button_id).toBe('test-button');
      expect(tracker.eventQueue[0].event.sessionId).toBe(tracker.getSessionId());
    });

    it('should track page views', () => {
      const url = 'https://example.com/test';
      const title = 'Test Page';

      tracker.page(url, title);

      expect(tracker.eventQueue.length).toBe(2); // Initial page view + new one
      const pageViewEvent = tracker.eventQueue[1].event;
      expect(pageViewEvent.type).toBe('pageview');
      expect(pageViewEvent.url).toBe(url);
      expect(pageViewEvent.title).toBe(title);
    });

    it('should track page views with UTM parameters', () => {
      const url = 'https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=test';

      tracker.page(url, 'Test Page');

      const pageViewEvent = tracker.eventQueue[1].event;
      expect(pageViewEvent.utm.source).toBe('google');
      expect(pageViewEvent.utm.medium).toBe('cpc');
      expect(pageViewEvent.utm.campaign).toBe('test');
    });

    it('should not track events when not initialized', () => {
      const uninitializedTracker = new Tracker();
      uninitializedTracker.track('test_event');

      expect(uninitializedTracker.eventQueue.length).toBe(0);
    });

    it('should sanitize event properties', () => {
      const properties = {
        normal_prop: 'value',
        nested_object: {
          deep: {
            very_deep: 'value'
          }
        },
        circular_ref: null
      };
      
      // Create circular reference
      properties.circular_ref = properties;

      tracker.track('test_event', properties);

      const event = tracker.eventQueue[0].event;
      expect(event.properties.normal_prop).toBe('value');
      expect(event.properties.nested_object).toBeTruthy();
      expect(typeof event.properties.circular_ref).toBe('object'); // Should be sanitized
    });
  });

  describe('User Identification', () => {
    beforeEach(() => {
      tracker.init({
        projectId: 'test-project'
      });
    });

    it('should identify users', () => {
      const userId = 'user-123';
      const properties = { name: 'Test User', email: 'test@example.com' };

      tracker.identify(userId, properties);

      expect(tracker.getUserId()).toBe(userId);
      expect(tracker.state.userProperties.name).toBe('Test User');
      expect(tracker.state.userProperties.email).toBe('test@example.com');
    });

    it('should update user properties', () => {
      tracker.identify('user-123', { name: 'Test User' });
      tracker.setUserProperties({ age: 25, location: 'Tokyo' });

      expect(tracker.state.userProperties.name).toBe('Test User');
      expect(tracker.state.userProperties.age).toBe(25);
      expect(tracker.state.userProperties.location).toBe('Tokyo');
    });

    it('should persist user data in storage', () => {
      const userId = 'user-123';
      tracker.identify(userId, { name: 'Test User' });

      // Create new tracker instance to test persistence
      const newTracker = new Tracker();
      newTracker.init({ projectId: 'test-project' });

      expect(newTracker.getUserId()).toBe(userId);
      expect(newTracker.state.userProperties.name).toBe('Test User');
      
      newTracker.destroy();
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    it('should maintain session across page loads', () => {
      tracker.init({ projectId: 'test' });
      const originalSessionId = tracker.getSessionId();

      // Simulate new tracker instance (page reload)
      const newTracker = new Tracker();
      newTracker.init({ projectId: 'test' });

      expect(newTracker.getSessionId()).toBe(originalSessionId);
      newTracker.destroy();
    });

    it('should create new session after timeout', () => {
      tracker.init({ projectId: 'test' });
      const originalSessionId = tracker.getSessionId();

      // Simulate 31 minutes passing
      jasmine.clock().tick(31 * 60 * 1000);

      const newTracker = new Tracker();
      newTracker.init({ projectId: 'test' });

      expect(newTracker.getSessionId()).not.toBe(originalSessionId);
      newTracker.destroy();
    });

    it('should update last activity on events', () => {
      tracker.init({ projectId: 'test' });
      const initialActivity = tracker.state.lastActivity;

      jasmine.clock().tick(1000);
      tracker.track('test_event');

      expect(tracker.state.lastActivity).toBeGreaterThan(initialActivity);
    });
  });

  describe('Event Batching and Sending', () => {
    beforeEach(() => {
      tracker.init({
        projectId: 'test-project',
        endpoint: '/api/collect',
        batchSize: 3,
        flushInterval: 1000
      });
    });

    it('should batch events before sending', () => {
      tracker.track('event1');
      tracker.track('event2');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(tracker.eventQueue.length).toBe(3); // Including initial pageview
    });

    it('should auto-flush when batch size is reached', async () => {
      tracker.track('event1'); // This should trigger flush (3 events total)

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch.calls.argsFor(0)[0]).toBe('/api/collect');
      
      const payload = JSON.parse(mockFetch.calls.argsFor(0)[1].body);
      expect(payload.events.length).toBe(3);
      expect(payload.projectId).toBe('test-project');
      expect(payload.sessionId).toBeTruthy();
    });

    it('should handle send failures with retry logic', async () => {
      mockFetch.and.returnValue(Promise.reject(new Error('Network error')));

      tracker.track('event1');
      tracker.track('event2');
      tracker.track('event3');

      await new Promise(resolve => setTimeout(resolve, 0));

      // Events should still be in queue after failure
      expect(tracker.eventQueue.length).toBeGreaterThan(0);
      
      // After 3 retries, events should be removed
      for (let i = 0; i < 3; i++) {
        await tracker.flush();
      }
      
      expect(tracker.eventQueue.length).toBe(0);
    });

    it('should send events periodically', () => {
      jasmine.clock().install();
      
      tracker.track('periodic_event');
      
      jasmine.clock().tick(1000); // Trigger flush interval
      
      expect(mockFetch).toHaveBeenCalled();
      
      jasmine.clock().uninstall();
    });
  });

  describe('Offline Storage', () => {
    beforeEach(() => {
      tracker.init({
        projectId: 'test-project',
        offlineStorage: true
      });
    });

    it('should store events offline when enabled', () => {
      tracker.track('offline_event');

      const storedQueue = JSON.parse(mockLocalStorage.getItem('ai_analytics_event_queue') || '[]');
      expect(storedQueue.length).toBeGreaterThan(0);
    });

    it('should load offline events on initialization', () => {
      // Pre-populate storage with events
      const offlineEvents = [{
        event: { type: 'stored_event', timestamp: Date.now() },
        retries: 0,
        timestamp: Date.now()
      }];
      mockLocalStorage.setItem('ai_analytics_event_queue', JSON.stringify(offlineEvents));

      const newTracker = new Tracker();
      newTracker.init({
        projectId: 'test-project',
        offlineStorage: true
      });

      expect(newTracker.eventQueue.length).toBeGreaterThan(1); // Including loaded events
      newTracker.destroy();
    });

    it('should not use offline storage when disabled', () => {
      const noOfflineTracker = new Tracker();
      noOfflineTracker.init({
        projectId: 'test-project',
        offlineStorage: false
      });

      noOfflineTracker.track('no_storage_event');

      const storedQueue = mockLocalStorage.getItem('ai_analytics_event_queue');
      expect(storedQueue).toBeNull();
      
      noOfflineTracker.destroy();
    });
  });

  describe('Click Tracking', () => {
    beforeEach(() => {
      tracker.init({
        projectId: 'test-project'
      });
    });

    it('should automatically track clicks', () => {
      // Create a button element
      const button = document.createElement('button');
      button.id = 'test-button';
      button.textContent = 'Click me';
      document.body.appendChild(button);

      // Simulate click
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        bubbles: true
      });
      button.dispatchEvent(clickEvent);

      // Check if click was tracked
      const clickEvents = tracker.eventQueue.filter(e => e.event.type === 'click');
      expect(clickEvents.length).toBe(1);
      
      const clickEventData = clickEvents[0].event;
      expect(clickEventData.selector).toBe('#test-button');
      expect(clickEventData.coordinates.x).toBe(100);
      expect(clickEventData.coordinates.y).toBe(200);
      expect(clickEventData.text).toBe('Click me');
    });

    it('should debounce rapid clicks', () => {
      jasmine.clock().install();
      
      const button = document.createElement('button');
      document.body.appendChild(button);

      // Simulate rapid clicks
      for (let i = 0; i < 5; i++) {
        button.click();
      }

      const clickEvents = tracker.eventQueue.filter(e => e.event.type === 'click');
      expect(clickEvents.length).toBe(1); // Only one click should be registered

      jasmine.clock().uninstall();
    });
  });

  describe('Error Tracking', () => {
    beforeEach(() => {
      tracker.init({
        projectId: 'test-project',
        errorTracking: true
      });
    });

    it('should track JavaScript errors', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error')
      });

      window.dispatchEvent(errorEvent);

      const errorEvents = tracker.eventQueue.filter(e => e.event.type === 'error');
      expect(errorEvents.length).toBe(1);
      
      const errorData = errorEvents[0].event;
      expect(errorData.message).toBe('Test error');
      expect(errorData.filename).toBe('test.js');
      expect(errorData.lineno).toBe(10);
      expect(errorData.colno).toBe(5);
    });

    it('should track unhandled promise rejections', () => {
      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        reason: new Error('Promise rejection'),
        promise: Promise.reject(new Error('Promise rejection'))
      });

      window.dispatchEvent(rejectionEvent);

      const errorEvents = tracker.eventQueue.filter(e => e.event.type === 'error');
      expect(errorEvents.length).toBe(1);
      
      const errorData = errorEvents[0].event;
      expect(errorData.message).toBe('Promise rejection');
      expect(errorData.properties.type).toBe('unhandledrejection');
    });
  });

  describe('Page Unload Handling', () => {
    beforeEach(() => {
      tracker.init({
        projectId: 'test-project'
      });
    });

    it('should send beacon on page unload', () => {
      tracker.track('test_event');

      // Simulate beforeunload
      const beforeUnloadEvent = new Event('beforeunload');
      window.dispatchEvent(beforeUnloadEvent);

      expect(navigator.sendBeacon).toHaveBeenCalled();
      
      const calls = navigator.sendBeacon.calls;
      const lastCall = calls.argsFor(calls.count() - 1);
      expect(lastCall[0]).toBe(tracker.state.config.endpoint);
      
      const payload = JSON.parse(lastCall[1]);
      expect(payload.events.length).toBeGreaterThan(0);
    });

    it('should send beacon on visibility change to hidden', () => {
      tracker.track('test_event');

      // Mock document.visibilityState
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true
      });

      // Simulate visibilitychange
      const visibilityChangeEvent = new Event('visibilitychange');
      document.dispatchEvent(visibilityChangeEvent);

      expect(navigator.sendBeacon).toHaveBeenCalled();
    });
  });

  describe('Web Vitals Integration', () => {
    beforeEach(() => {
      // Mock PerformanceObserver
      global.PerformanceObserver = function(callback) {
        this.callback = callback;
        this.observe = jasmine.createSpy('observe');
        this.disconnect = jasmine.createSpy('disconnect');
      };

      tracker.init({
        projectId: 'test-project',
        webVitals: true
      });
    });

    it('should initialize web vitals collection when enabled', () => {
      expect(tracker.webVitalsCollector).toBeTruthy();
    });

    it('should not initialize web vitals when disabled', () => {
      const noVitalsTracker = new Tracker();
      noVitalsTracker.init({
        projectId: 'test-project',
        webVitals: false
      });

      expect(noVitalsTracker.webVitalsCollector).toBeFalsy();
      noVitalsTracker.destroy();
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      tracker.init({ projectId: 'test' });
    });

    it('should generate proper CSS selectors', () => {
      // Test ID selector
      const elementWithId = document.createElement('div');
      elementWithId.id = 'test-id';
      expect(tracker.getElementSelector(elementWithId)).toBe('#test-id');

      // Test class selector
      const elementWithClass = document.createElement('div');
      elementWithClass.className = 'test-class another-class';
      expect(tracker.getElementSelector(elementWithClass)).toBe('.test-class');

      // Test tag selector
      const elementWithoutIdOrClass = document.createElement('span');
      expect(tracker.getElementSelector(elementWithoutIdOrClass)).toBe('span');
    });

    it('should debounce function calls', () => {
      jasmine.clock().install();
      
      const mockFunction = jasmine.createSpy('mockFunction');
      const debouncedFunction = tracker.debounce(mockFunction, 100);

      // Call multiple times quickly
      debouncedFunction('arg1');
      debouncedFunction('arg2');
      debouncedFunction('arg3');

      // Should only call once immediately
      expect(mockFunction).toHaveBeenCalledTimes(1);
      expect(mockFunction).toHaveBeenCalledWith('arg1');

      // Advance time and call again
      jasmine.clock().tick(150);
      debouncedFunction('arg4');

      expect(mockFunction).toHaveBeenCalledTimes(2);
      expect(mockFunction).toHaveBeenCalledWith('arg4');
      
      jasmine.clock().uninstall();
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should clean up properly on destroy', () => {
      tracker.init({
        projectId: 'test-project',
        errorTracking: true
      });

      // Track some events
      tracker.track('test_event');

      // Destroy tracker
      tracker.destroy();

      // Should send remaining events
      expect(navigator.sendBeacon).toHaveBeenCalled();

      // Should clean up event listeners (test by checking if new events are not tracked)
      const button = document.createElement('button');
      document.body.appendChild(button);
      button.click();

      // Events should not be added after destroy
      const clickEvents = tracker.eventQueue.filter(e => e.event.type === 'click');
      expect(clickEvents.length).toBe(0);
    });

    it('should reset state properly', () => {
      tracker.init({ projectId: 'test' });
      tracker.track('test_event');
      tracker.identify('user-123');

      tracker.reset();

      expect(tracker.state.isInitialized).toBe(false);
      expect(tracker.eventQueue.length).toBe(0);
      expect(tracker.getUserId()).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing window/document gracefully', () => {
      // Temporarily remove window and document
      const originalWindow = global.window;
      const originalDocument = global.document;

      delete global.window;
      delete global.document;

      const serverTracker = new Tracker();
      
      // Should not throw errors
      expect(() => {
        serverTracker.init({ projectId: 'test' });
        serverTracker.track('test');
        serverTracker.page();
      }).not.toThrow();

      // Restore
      global.window = originalWindow;
      global.document = originalDocument;
    });

    it('should handle storage quota exceeded', () => {
      // Mock storage quota exceeded
      mockLocalStorage.setItem = jasmine.createSpy('setItem').and.throwError('QuotaExceededError');

      tracker.init({
        projectId: 'test-project',
        offlineStorage: true
      });

      // Should not throw error when storage fails
      expect(() => {
        tracker.track('test_event');
      }).not.toThrow();
    });

    it('should handle invalid JSON in storage', () => {
      // Corrupt storage data
      mockLocalStorage.setItem('ai_analytics_event_queue', '{invalid json}');

      tracker.init({
        projectId: 'test-project',
        offlineStorage: true
      });

      // Should initialize without errors
      expect(tracker.state.isInitialized).toBe(true);
      expect(tracker.eventQueue.length).toBe(1); // Just the initial pageview
    });
  });
});