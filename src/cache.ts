import Redis from 'ioredis';

interface CacheService {
  connect: () => void;
  remove: (...keys: string[]) => Promise<number>;
  disconnect: () => void;
  readBlockList: () => Promise<string[]>;
}

class Cache implements CacheService {
  client: Redis.Redis | null = null;

  public connect(): void {
    this.client = new Redis({
      maxRetriesPerRequest: 3,
      host: process.env.REDIS_HOST || 'localhost',
    });
    console.log(`Redis server connected URL: ${process.env.REDIS_HOST}`);
  }

  public remove(...keys: string[]): Promise<number> {
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

  public async createFeed(queueData: CreateFeedArgs): Promise<void> {
    const queueName = this.queueName.feed;
    cache.client!.lpush(queueName, JSON.stringify(queueData));
  }

  public async readBlockList(): Promise<string[]> {
    if (!this.client) {
      this.connect();
    }

    try {
      const keyname = this.setName.blockList;
      const list = await this.client?.smembers(keyname);
      return list ?? [];
    } catch (error) {
      throw error;
    }
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

  get queueName(): Record<QueueName, string> {
    return {
      feed: 'queue:feed',
    };
  }

  private get setName(): Record<SetName, string> {
    return {
      blockList: 'set:blockList',
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

type SetName = 'blockList';

type CreateFeedArgs = {
  fk_following_id: string;
  fk_post_id: string;
};
