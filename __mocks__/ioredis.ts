type Listener = (...args: unknown[]) => void;

class MockRedis {
  private store = new Map<string, string>();
  private ttlMap = new Map<string, number>();
  private listeners: Record<string, Listener[]> = {};

  constructor() {
    // Simulate async connect event
    setTimeout(() => {
      this.emit('connect');
    }, 0);
  }

  private emit(event: string, ...args: unknown[]) {
    this.listeners[event]?.forEach((listener) => listener(...args));
  }

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  async setex(key: string, ttlSeconds: number, value: string) {
    this.store.set(key, value);
    this.ttlMap.set(key, Date.now() + ttlSeconds * 1000);
    return 'OK';
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    this.ttlMap.delete(key);
    return 'OK';
  }

  async get(key: string) {
    const expiresAt = this.ttlMap.get(key);
    if (expiresAt && expiresAt < Date.now()) {
      this.store.delete(key);
      this.ttlMap.delete(key);
      return null;
  }
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async ttl(key: string) {
    const expiresAt = this.ttlMap.get(key);
    if (!expiresAt) {
      return -1;
    }
    const remaining = Math.ceil((expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  pipeline() {
    const ops: Array<() => void> = [];
    const self = this;
    return {
      set(key: string, value: string) {
        ops.push(() => {
          self.store.set(key, value);
        });
        return this;
      },
      async exec() {
        ops.forEach((op) => op());
        return [];
      },
    };
  }

  async del(...keys: string[]) {
    keys.forEach((key) => {
      this.store.delete(key);
      this.ttlMap.delete(key);
    });
    return keys.length;
  }

  async keys(pattern: string) {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  }

  async incr(key: string) {
    const current = Number(await this.get(key)) || 0;
    const next = current + 1;
    await this.set(key, next.toString());
    return next;
  }

  async quit() {
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }
}

const instances: MockRedis[] = [];

const MockRedisConstructor = function (..._args: unknown[]) {
  const instance = new MockRedis();
  instances.push(instance);
  return instance;
} as unknown as { new (...args: unknown[]): MockRedis };

export const __resetRedisMock = () => {
  instances.splice(0, instances.length);
};

export default MockRedisConstructor;
