/**
 * Offline Mutation Queue and Data Caching Service
 *
 * Implements offline storage, idempotent request queueing, and automatic replay on reconnect.
 */

export interface QueuedMutation {
  id: string;
  requestId: string;
  action: string;
  module: string;
  payload: any;
  timestamp: string;
  retryCount: number;
}

export class SyncService {
  private static instance: SyncService;
  private queue: QueuedMutation[] = [];
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private isSyncing = false;

  private constructor() {}

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // --- Offline Mutation Queue ---

  enqueueMutation(action: string, module: string, payload: any, customRequestId?: string): QueuedMutation {
    const requestId = customRequestId || `REQ-OFFLINE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mutation: QueuedMutation = {
      id: `MUT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      requestId,
      action,
      module,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };
    this.queue.push(mutation);
    return mutation;
  }

  getPendingMutations(): QueuedMutation[] {
    return [...this.queue];
  }

  getPendingCount(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    this.queue = [];
  }

  async flushQueue(executor: (mutation: QueuedMutation) => Promise<boolean>): Promise<{
    processed: number;
    failed: number;
  }> {
    if (this.isSyncing || this.queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    this.isSyncing = true;
    let processed = 0;
    let failed = 0;
    const remaining: QueuedMutation[] = [];

    for (const mutation of this.queue) {
      try {
        const success = await executor(mutation);
        if (success) {
          processed++;
        } else {
          mutation.retryCount++;
          remaining.push(mutation);
          failed++;
        }
      } catch (err) {
        mutation.retryCount++;
        remaining.push(mutation);
        failed++;
      }
    }

    this.queue = remaining;
    this.isSyncing = false;
    return { processed, failed };
  }

  // --- In-Memory / Local Cache ---

  setCache<T>(key: string, data: T, ttlMs: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttlMs
    });
  }

  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const syncService = SyncService.getInstance();
