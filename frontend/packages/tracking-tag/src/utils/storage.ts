/**
 * Storage abstraction layer with fallbacks
 * Provides offline capability with multiple storage options
 */

import { StorageInterface, QueuedEvent } from '../types';
import { safeJsonParse, safeJsonStringify, isLocalStorageAvailable, isSessionStorageAvailable } from './index';

/**
 * Memory storage fallback when other storage methods are unavailable
 */
class MemoryStorage implements StorageInterface {
  private _data: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this._data.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this._data.set(key, value);
  }

  removeItem(key: string): void {
    this._data.delete(key);
  }

  clear(): void {
    this._data.clear();
  }
}

/**
 * Smart storage manager that chooses the best available storage method
 */
export class StorageManager {
  private _storage: StorageInterface;
  private readonly _prefix = 'ai_analytics_';

  constructor() {
    // Choose storage method based on availability
    if (isLocalStorageAvailable()) {
      this._storage = window.localStorage;
    } else if (isSessionStorageAvailable()) {
      this._storage = window.sessionStorage;
    } else {
      this._storage = new MemoryStorage();
    }
  }

  /**
   * Get prefixed key
   */
  private _getKey(key: string): string {
    return `${this._prefix}${key}`;
  }

  /**
   * Get item from storage
   */
  getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      const value = this._storage.getItem(this._getKey(key));
      if (value === null) return defaultValue || null;
      return safeJsonParse(value, defaultValue);
    } catch {
      return defaultValue || null;
    }
  }

  /**
   * Set item in storage
   */
  setItem<T>(key: string, value: T): void {
    try {
      this._storage.setItem(this._getKey(key), safeJsonStringify(value));
    } catch {
      // Storage failed, silently ignore
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    try {
      this._storage.removeItem(this._getKey(key));
    } catch {
      // Storage failed, silently ignore
    }
  }

  /**
   * Clear all analytics data from storage
   */
  clear(): void {
    try {
      if (this._storage instanceof MemoryStorage) {
        this._storage.clear();
        return;
      }

      // For browser storage, only clear our prefixed items
      const keysToRemove: string[] = [];
      const storage = this._storage as Storage;

      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this._prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key));
    } catch {
      // Storage failed, silently ignore
    }
  }

  /**
   * Get event queue from storage
   */
  getEventQueue(): QueuedEvent[] {
    return this.getItem<QueuedEvent[]>('event_queue', []);
  }

  /**
   * Save event queue to storage
   */
  setEventQueue(queue: QueuedEvent[]): void {
    // Limit queue size to prevent storage overflow
    const maxQueueSize = 1000;
    const limitedQueue = queue.slice(-maxQueueSize);
    this.setItem('event_queue', limitedQueue);
  }

  /**
   * Add event to queue
   */
  addToQueue(event: QueuedEvent): void {
    const queue = this.getEventQueue();
    queue.push(event);
    this.setEventQueue(queue);
  }

  /**
   * Remove events from queue
   */
  removeFromQueue(events: QueuedEvent[]): void {
    const queue = this.getEventQueue();
    const eventsToRemove = new Set(events.map(e => e.timestamp));
    const filteredQueue = queue.filter(e => !eventsToRemove.has(e.timestamp));
    this.setEventQueue(filteredQueue);
  }

  /**
   * Get session data
   */
  getSessionData(): {
    sessionId: string | null;
    userId: string | null;
    lastActivity: number | null;
    userProperties: Record<string, any>;
  } {
    return {
      sessionId: this.getItem<string>('session_id'),
      userId: this.getItem<string>('user_id'),
      lastActivity: this.getItem<number>('last_activity'),
      userProperties: this.getItem<Record<string, any>>('user_properties', {}),
    };
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string): void {
    this.setItem('session_id', sessionId);
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.setItem('user_id', userId);
  }

  /**
   * Set last activity timestamp
   */
  setLastActivity(timestamp: number): void {
    this.setItem('last_activity', timestamp);
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, any>): void {
    const existing = this.getItem<Record<string, any>>('user_properties', {});
    const merged = { ...existing, ...properties };
    this.setItem('user_properties', merged);
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.removeItem('session_id');
    this.removeItem('user_id');
    this.removeItem('last_activity');
    this.removeItem('user_properties');
  }

  /**
   * Get storage size estimate in bytes
   */
  getStorageSize(): number {
    try {
      let size = 0;
      if (this._storage instanceof MemoryStorage) {
        // Estimate size for memory storage
        for (const [key, value] of (this._storage as any)._data) {
          size += key.length + value.length;
        }
      } else {
        // Estimate size for browser storage
        const storage = this._storage as Storage;
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith(this._prefix)) {
            const value = storage.getItem(key);
            size += key.length + (value?.length || 0);
          }
        }
      }
      return size * 2; // Rough estimate accounting for UTF-16 encoding
    } catch {
      return 0;
    }
  }

  /**
   * Check if storage is available and functional
   */
  isAvailable(): boolean {
    try {
      const testKey = this._getKey('__test__');
      this._storage.setItem(testKey, 'test');
      const value = this._storage.getItem(testKey);
      this._storage.removeItem(testKey);
      return value === 'test';
    } catch {
      return false;
    }
  }

  /**
   * Get storage type being used
   */
  getStorageType(): 'localStorage' | 'sessionStorage' | 'memory' {
    if (this._storage === window.localStorage) return 'localStorage';
    if (this._storage === window.sessionStorage) return 'sessionStorage';
    return 'memory';
  }
}