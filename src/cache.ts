import Redis from 'ioredis';

class Cache {
  client: Redis.Redis | null = null;

  connect(): void {
    this.client = new Redis({
      maxRetriesPerRequest: 3,
      host: process.env.REDIS_HOST || 'localhost',
    });
  }

  remove(...keys: string[]): Promise<number> {
    if (!this.client) {
      this.connect();
    }
    return this.client!.del(...keys);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      return;
    }
    return Promise.resolve();
  }

  get generateKey(): GenerateCacheKey {
    return {
      recommendedPostKey: (postId: string) => `${postId}:recommend`,
      postCacheKey: (username: string, postUrlSlug: string) => `ssr:/@${username}/${postUrlSlug}`,
      userCacheKey: (username: string) => `ssr:/@${username}`,
      postSeriesKey: (username: string, seriesUrlSlug: string) =>
        `ssr:/@${username}/series/${seriesUrlSlug}`,
      changeEmailKey: (code: string) => `changeEmailCode:${code}`,
    };
  }

  get queueName() {
    return {
      feed: 'queue:feed',
    };
  }
}

const cache = new Cache();
cache.connect();

export default cache;

type GenerateCacheKey = {
  recommendedPostKey: (postId: string) => string;
  postCacheKey: (username: string, postUrlSlug: string) => string;
  userCacheKey: (username: string) => string;
  postSeriesKey: (username: string, seriesUrlSlug: string) => string;
  changeEmailKey: (code: string) => string;
};

type QueueName = 'feed';
