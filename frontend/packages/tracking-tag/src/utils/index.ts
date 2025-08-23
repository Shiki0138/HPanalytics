/**
 * Utility functions for AI Analytics Tracking Tag
 * Optimized for performance and minimal bundle size
 */

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current timestamp in milliseconds
 */
export function now(): number {
  return performance?.now ? performance.now() + performance.timeOrigin : Date.now();
}

/**
 * Debounce function to limit execution frequency
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = undefined;
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringify with error handling
 */
export function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '{}';
  }
}

/**
 * Get element selector string
 */
export function getElementSelector(element: Element): string {
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
 * Get UTM parameters from URL
 */
export function getUtmParams(url: string = window.location.href): Record<string, string> {
  const urlObj = new URL(url);
  const params: Record<string, string> = {};
  
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  
  utmKeys.forEach((key) => {
    const value = urlObj.searchParams.get(key);
    if (value) {
      params[key.replace('utm_', '')] = value;
    }
  });
  
  return Object.keys(params).length > 0 ? params : {};
}

/**
 * Get device information
 */
export function getDeviceInfo(): {
  userAgent: string;
  screenResolution: string;
  viewportSize: string;
  devicePixelRatio: number;
  language: string;
  timezone: string;
  connectionType?: string;
  isMobile: boolean;
  isTouch: boolean;
} {
  const { navigator, screen, window: win } = globalThis as any;
  
  return {
    userAgent: navigator?.userAgent || '',
    screenResolution: screen ? `${screen.width}x${screen.height}` : '',
    viewportSize: win ? `${win.innerWidth}x${win.innerHeight}` : '',
    devicePixelRatio: win?.devicePixelRatio || 1,
    language: navigator?.language || navigator?.userLanguage || '',
    timezone: Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone || '',
    connectionType: (navigator as any)?.connection?.effectiveType,
    isMobile: /Mobi|Android/i.test(navigator?.userAgent || ''),
    isTouch: 'ontouchstart' in win || navigator?.maxTouchPoints > 0,
  };
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  if (!isBrowser()) return false;
  
  try {
    const test = '__storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if sessionStorage is available
 */
export function isSessionStorageAvailable(): boolean {
  if (!isBrowser()) return false;
  
  try {
    const test = '__storage_test__';
    window.sessionStorage.setItem(test, test);
    window.sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  
  return null;
}

/**
 * Set cookie with options
 */
export function setCookie(
  name: string,
  value: string,
  options: {
    days?: number;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): void {
  if (!isBrowser()) return;
  
  const { days = 365, domain, secure = true, sameSite = 'lax' } = options;
  
  let cookieString = `${name}=${value}`;
  
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    cookieString += `; expires=${date.toUTCString()}`;
  }
  
  cookieString += `; path=/`;
  
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  
  if (secure) {
    cookieString += `; secure`;
  }
  
  cookieString += `; samesite=${sameSite}`;
  
  document.cookie = cookieString;
}

/**
 * Remove cookie
 */
export function removeCookie(name: string, domain?: string): void {
  setCookie(name, '', { days: -1, domain });
}

/**
 * Simple hash function for generating session IDs
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize object for JSON serialization
 */
export function sanitizeObject(obj: any, maxDepth: number = 3): any {
  if (maxDepth <= 0) return '[Object]';
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'function') return '[Function]';
  
  if (typeof obj === 'symbol') return '[Symbol]';
  
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
  }
  
  if (obj instanceof Date) return obj.toISOString();
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.slice(0, 100).map(item => sanitizeObject(item, maxDepth - 1));
  }
  
  const result: Record<string, any> = {};
  let count = 0;
  
  for (const [key, value] of Object.entries(obj)) {
    if (count >= 50) break; // Limit object size
    result[key] = sanitizeObject(value, maxDepth - 1);
    count++;
  }
  
  return result;
}