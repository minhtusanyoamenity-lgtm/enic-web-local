// In a true Serverless environment like Vercel, this memory cache will be reset on cold starts.
// For production with high concurrency, you should replace this with a Redis store (e.g., Upstash).

const cache = new Map<string, any>();
const locks = new Set<string>();

export const kv = {
  get: async <T>(key: string): Promise<T | null> => {
    return cache.get(key) || null;
  },
  set: async (key: string, value: any): Promise<void> => {
    cache.set(key, value);
  },
  delete: async (key: string): Promise<void> => {
    cache.delete(key);
  }
};

export class MemoryLock {
  static async waitLock(key: string, timeoutMs: number = 10000): Promise<void> {
    const start = Date.now();
    while (locks.has(key)) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Timeout waiting for lock: ${key}`);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    locks.add(key);
  }

  static releaseLock(key: string): void {
    locks.delete(key);
  }
}
