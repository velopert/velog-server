import Redis from 'ioredis';

class Cache {
  client: Redis.Redis | null = null;

  connect() {
    this.client = new Redis({
      maxRetriesPerRequest: 3,
      host: process.env.REDIS_HOST || 'localhost'
    });
  }

  remove(...keys: string[]) {
    if (!this.client) {
      this.connect();
    }
    return this.client!.del(...keys);
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      return;
    }
    return Promise.resolve();
  }
}

const cache = new Cache();

export default cache;
