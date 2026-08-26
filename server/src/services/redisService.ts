import { Redis } from 'ioredis';

class RedisStorageService {
  private client: Redis | null = null;
  private memoryStore: Map<string, { value: string; expiresAt?: number }> = new Map();
  private isUsingMemory = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        enableReadyCheck: false,
        lazyConnect: true,
      });

      this.client.connect().then(() => {
        console.log(' connected to Redis successfully');
      }).catch((err: Error) => {
        console.warn(' Redis connection failed. Falling back to robust in-memory store for local dev.', err.message);
        this.isUsingMemory = true;
        this.client = null;
      });

      this.client.on('error', (err: Error) => {
        if (!this.isUsingMemory) {
          console.warn(' Redis error, using in-memory store:', err.message);
          this.isUsingMemory = true;
        }
      });
    } catch {
      this.isUsingMemory = true;
    }
  }

  private cleanMemoryExpired() {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isUsingMemory || !this.client) {
      this.cleanMemoryExpired();
      const entry = this.memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt <= Date.now()) {
        this.memoryStore.delete(key);
        return null;
      }
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return entry.value as unknown as T;
      }
    }

    try {
      const data = await this.client.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data) as T;
      } catch {
        return data as unknown as T;
      }
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const strValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (this.isUsingMemory || !this.client) {
      this.cleanMemoryExpired();
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
      this.memoryStore.set(key, { value: strValue, expiresAt });
      return;
    }

    try {
      if (ttlSeconds) {
        await this.client.set(key, strValue, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, strValue);
      }
    } catch {
      // Fallback
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
      this.memoryStore.set(key, { value: strValue, expiresAt });
    }
  }

  async del(key: string): Promise<void> {
    if (this.isUsingMemory || !this.client) {
      this.memoryStore.delete(key);
      return;
    }
    try {
      await this.client.del(key);
    } catch {
      this.memoryStore.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.isUsingMemory || !this.client) {
      this.cleanMemoryExpired();
      return this.memoryStore.has(key);
    }
    try {
      const res = await this.client.exists(key);
      return res === 1;
    } catch {
      return this.memoryStore.has(key);
    }
  }
}

export const redisService = new RedisStorageService();
