/**
 * Web Vitals collector for Core Web Vitals metrics
 * Implements Google's recommended measurement approach
 */

import { Metric, WebVitalEvent } from '../types';
import { now } from '../utils';

type MetricCallback = (metric: Metric) => void;

/**
 * Web Vitals collector class
 */
export class WebVitalsCollector {
  private _callbacks: Set<MetricCallback> = new Set();
  private _collected: Set<string> = new Set();

  constructor() {
    this._initCollectors();
  }

  /**
   * Subscribe to Web Vitals metrics
   */
  onMetric(callback: MetricCallback): () => void {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  /**
   * Initialize all collectors
   */
  private _initCollectors(): void {
    // Only collect in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this._collectCLS();
    this._collectFCP();
    this._collectFID();
    this._collectLCP();
    this._collectTTFB();
  }

  /**
   * Emit metric to all callbacks
   */
  private _emit(metric: Metric): void {
    if (this._collected.has(metric.name)) return;
    this._collected.add(metric.name);

    this._callbacks.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        // Silently ignore callback errors
      }
    });
  }

  /**
   * Get metric rating based on thresholds
   */
  private _getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      CLS: [0.1, 0.25],
      FCP: [1800, 3000],
      FID: [100, 300],
      LCP: [2500, 4000],
      TTFB: [800, 1800],
    };

    const threshold = thresholds[name as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold[0]!) return 'good';
    if (value <= threshold[1]!) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get navigation type
   */
  private _getNavigationType(): string {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const nav = performance.getEntriesByType('navigation')[0] as any;
      return nav?.type || 'navigate';
    }
    return 'navigate';
  }

  /**
   * Collect Cumulative Layout Shift (CLS)
   */
  private _collectCLS(): void {
    if (!('LayoutShift' in window)) return;

    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];
    let currentSessionId = this._generateSessionId();

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;

        // Only count layout shifts without recent user input
        if (!layoutShift.hadRecentInput) {
          const isNewSession = this._isNewCLSSession(layoutShift, currentSessionId);

          if (isNewSession) {
            // Emit previous session if it exists
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              clsEntries = sessionEntries;
            }

            // Start new session
            currentSessionId = this._generateSessionId();
            sessionValue = layoutShift.value;
            sessionEntries = [entry];
          } else {
            sessionValue += layoutShift.value;
            sessionEntries.push(entry);
          }
        }
      }

      // Update current CLS value
      if (sessionValue > clsValue) {
        clsValue = sessionValue;
        clsEntries = sessionEntries;
      }
    });

    try {
      observer.observe({ type: 'layout-shift', buffered: true });

      // Report CLS when the page visibility changes
      const reportCLS = () => {
        this._emit({
          name: 'CLS',
          value: clsValue,
          rating: this._getRating('CLS', clsValue),
          entries: clsEntries,
          navigationType: this._getNavigationType(),
        });
      };

      // Report on visibility change or page unload
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          reportCLS();
        }
      });

      window.addEventListener('beforeunload', reportCLS);
    } catch (e) {
      // Observer not supported
    }
  }

  /**
   * Check if layout shift is part of new session
   */
  private _isNewCLSSession(entry: any, currentSessionId: string): boolean {
    const sessionGap = 1000; // 1 second
    const maxSessionDuration = 5000; // 5 seconds

    const isFirstEntry = !this._lastCLSTime;
    const hasSessionGap = entry.startTime - (this._lastCLSTime || 0) > sessionGap;
    const hasMaxDuration = entry.startTime - (this._firstCLSTime || entry.startTime) > maxSessionDuration;

    if (isFirstEntry) {
      this._firstCLSTime = entry.startTime;
    }
    this._lastCLSTime = entry.startTime;

    return isFirstEntry || hasSessionGap || hasMaxDuration;
  }

  private _firstCLSTime?: number;
  private _lastCLSTime?: number;

  /**
   * Generate session ID for CLS measurement
   */
  private _generateSessionId(): string {
    return Math.random().toString(36).substring(2);
  }

  /**
   * Collect First Contentful Paint (FCP)
   */
  private _collectFCP(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this._emit({
            name: 'FCP',
            value: entry.startTime,
            rating: this._getRating('FCP', entry.startTime),
            entries: [entry],
            navigationType: this._getNavigationType(),
          });
          observer.disconnect();
          break;
        }
      }
    });

    try {
      observer.observe({ type: 'paint', buffered: true });
    } catch (e) {
      // Observer not supported
    }
  }

  /**
   * Collect First Input Delay (FID)
   */
  private _collectFID(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const firstInput = entry as any;
        const fid = firstInput.processingStart - firstInput.startTime;

        this._emit({
          name: 'FID',
          value: fid,
          rating: this._getRating('FID', fid),
          entries: [entry],
          navigationType: this._getNavigationType(),
        });
        
        observer.disconnect();
        break;
      }
    });

    try {
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // Observer not supported
    }
  }

  /**
   * Collect Largest Contentful Paint (LCP)
   */
  private _collectLCP(): void {
    let lcpValue = 0;
    let lcpEntry: PerformanceEntry | null = null;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      if (lastEntry && lastEntry.startTime > lcpValue) {
        lcpValue = lastEntry.startTime;
        lcpEntry = lastEntry;
      }
    });

    try {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // Report LCP when the page visibility changes
      const reportLCP = () => {
        if (lcpEntry) {
          this._emit({
            name: 'LCP',
            value: lcpValue,
            rating: this._getRating('LCP', lcpValue),
            entries: [lcpEntry],
            navigationType: this._getNavigationType(),
          });
        }
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          reportLCP();
        }
      });

      window.addEventListener('beforeunload', reportLCP);
    } catch (e) {
      // Observer not supported
    }
  }

  /**
   * Collect Time to First Byte (TTFB)
   */
  private _collectTTFB(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navigation = entry as any;
        const ttfb = navigation.responseStart - navigation.requestStart;

        this._emit({
          name: 'TTFB',
          value: ttfb,
          rating: this._getRating('TTFB', ttfb),
          entries: [entry],
          navigationType: this._getNavigationType(),
        });
        
        observer.disconnect();
        break;
      }
    });

    try {
      observer.observe({ type: 'navigation', buffered: true });
    } catch (e) {
      // Fallback to performance.timing
      if (typeof performance !== 'undefined' && performance.timing) {
        const ttfb = performance.timing.responseStart - performance.timing.requestStart;
        if (ttfb > 0) {
          this._emit({
            name: 'TTFB',
            value: ttfb,
            rating: this._getRating('TTFB', ttfb),
            entries: [],
            navigationType: 'navigate',
          });
        }
      }
    }
  }

  /**
   * Manually collect all available metrics
   */
  collectAll(): void {
    // Try to collect any metrics that might be immediately available
    try {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry && !this._collected.has('FCP')) {
        this._emit({
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: this._getRating('FCP', fcpEntry.startTime),
          entries: [fcpEntry],
          navigationType: this._getNavigationType(),
        });
      }
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Clean up observers
   */
  destroy(): void {
    this._callbacks.clear();
    this._collected.clear();
  }
}