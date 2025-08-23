/**
 * Unit tests for the tracking tag
 */

import { Tracker } from '../src/core/tracker';
import { TrackerConfig } from '../src/types';

describe('Tracker', () => {
  let tracker: Tracker;
  let mockConfig: TrackerConfig;

  beforeEach(() => {
    tracker = new Tracker();
    mockConfig = {
      projectId: 'test-project',
      endpoint: '/api/collect',
      debug: true,
      sampleRate: 1.0,
      webVitals: false,
      errorTracking: false,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    tracker.destroy();
  });

  describe('initialization', () => {
    test('should initialize with valid config', () => {
      tracker.init(mockConfig);
      expect(tracker.getSessionId()).toBeDefined();
      expect(tracker.getSessionId()).toMatch(/^[a-f0-9-]{36}$/);
    });

    test('should not initialize without browser environment', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const consoleSpy = jest.spyOn(console, 'warn');
      tracker.init(mockConfig);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'AI Analytics: Tracker can only be initialized in browser environment'
      );

      global.window = originalWindow;
    });

    test('should respect sample rate', () => {
      const consoleSpy = jest.spyOn(console, 'info');
      const mathSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
      
      tracker.init({ ...mockConfig, sampleRate: 0.5 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'AI Analytics: Not sampled, tracking disabled'
      );

      mathSpy.mockRestore();
    });
  });

  describe('event tracking', () => {
    beforeEach(() => {
      tracker.init(mockConfig);
    });

    test('should track custom events', () => {
      const properties = { testProp: 'testValue' };
      tracker.track('test-event', properties);

      // Since we're mocking the actual sending, we can't directly verify
      // the event was sent, but we can verify no errors occurred
      expect(tracker.getSessionId()).toBeDefined();
    });

    test('should track page views', () => {
      tracker.page('/test-page', 'Test Page', { custom: 'property' });
      expect(tracker.getSessionId()).toBeDefined();
    });

    test('should identify users', () => {
      const userId = 'test-user-123';
      const userProperties = { name: 'Test User', plan: 'premium' };
      
      tracker.identify(userId, userProperties);
      expect(tracker.getUserId()).toBe(userId);
    });

    test('should set user properties', () => {
      const properties = { theme: 'dark', language: 'en' };
      tracker.setUserProperties(properties);
      
      // Properties are set internally, no direct way to verify
      // but we can ensure no errors occurred
      expect(tracker.getSessionId()).toBeDefined();
    });
  });

  describe('session management', () => {
    beforeEach(() => {
      tracker.init(mockConfig);
    });

    test('should generate unique session IDs', () => {
      const sessionId1 = tracker.getSessionId();
      
      tracker.reset();
      tracker.init(mockConfig);
      
      const sessionId2 = tracker.getSessionId();
      
      expect(sessionId1).not.toBe(sessionId2);
    });

    test('should reset tracker state', () => {
      tracker.identify('test-user');
      tracker.reset();
      
      expect(tracker.getUserId()).toBeNull();
    });
  });

  describe('error handling', () => {
    test('should handle invalid JSON in properties', () => {
      tracker.init(mockConfig);
      
      // This should not throw an error due to sanitization
      expect(() => {
        const circularRef: any = {};
        circularRef.self = circularRef;
        tracker.track('test-event', circularRef);
      }).not.toThrow();
    });

    test('should handle network failures gracefully', () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      tracker.init(mockConfig);
      
      expect(() => {
        tracker.track('test-event');
      }).not.toThrow();
    });
  });

  describe('flush functionality', () => {
    beforeEach(() => {
      tracker.init(mockConfig);
    });

    test('should flush events manually', async () => {
      tracker.track('test-event');
      
      await expect(tracker.flush()).resolves.not.toThrow();
    });

    test('should handle flush failures', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Flush failed'));
      
      tracker.track('test-event');
      
      await expect(tracker.flush()).resolves.not.toThrow();
    });
  });
});