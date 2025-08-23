/**
 * AI Analytics Tracking Tag
 * High-performance, lightweight analytics tracking library
 */

import { Tracker } from './core/tracker';
import { TrackerConfig, TrackerInstance } from './types';

// Global queue for commands before initialization
interface AnalyticsCommand {
  method: string;
  args: any[];
}

declare global {
  interface Window {
    aiAnalytics: TrackerInstance | AnalyticsCommand[];
    aiAnalyticsQ?: AnalyticsCommand[];
  }
}

/**
 * Create tracker instance
 */
function createTracker(): TrackerInstance {
  return new Tracker();
}

/**
 * Initialize the analytics system
 */
function init(): void {
  // Check if already initialized
  if (typeof window !== 'undefined' && window.aiAnalytics && !Array.isArray(window.aiAnalytics)) {
    return;
  }

  const tracker = createTracker();
  const queue = (window?.aiAnalytics as AnalyticsCommand[]) || [];

  // Process queued commands
  queue.forEach(({ method, args }) => {
    if (typeof tracker[method as keyof TrackerInstance] === 'function') {
      try {
        (tracker as any)[method](...args);
      } catch (error) {
        console.error(`AI Analytics: Error executing ${method}:`, error);
      }
    }
  });

  // Replace queue with tracker instance
  if (typeof window !== 'undefined') {
    window.aiAnalytics = tracker;
  }
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Check if script is loaded asynchronously
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, initialize immediately
    setTimeout(init, 0);
  }
}

// Export for module usage
export { createTracker, Tracker };
export type { TrackerConfig, TrackerInstance };
export * from './types';

// UMD support
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createTracker, Tracker };
}

/**
 * Async loader function for script tag integration
 */
(function(window: any) {
  // Skip if already loaded
  if (window.aiAnalytics && !Array.isArray(window.aiAnalytics)) {
    return;
  }

  // Create command queue if it doesn't exist
  window.aiAnalytics = window.aiAnalytics || [];
  window.aiAnalyticsQ = window.aiAnalyticsQ || [];

  // Proxy function to queue commands before initialization
  function push(method: string, ...args: any[]) {
    if (Array.isArray(window.aiAnalytics)) {
      window.aiAnalytics.push({ method, args });
    } else {
      // Already initialized, call method directly
      if (typeof window.aiAnalytics[method] === 'function') {
        window.aiAnalytics[method](...args);
      }
    }
  }

  // Provide convenient methods
  const methods = ['init', 'track', 'page', 'identify', 'setUserProperties', 'flush', 'reset'];
  
  methods.forEach(method => {
    (window.aiAnalytics as any)[method] = (...args: any[]) => push(method, ...args);
  });

})(typeof window !== 'undefined' ? window : {});