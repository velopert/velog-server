import cache from '../cache';

export async function checkBlockList(userId: string, username: string = '') {
  const blockListFromEnv = (process.env.BLOCK_LIST ?? '').split(',');
  const blockListFromCache = await cache.readBlockList();
  const isBlocked = blockListFromEnv.includes(userId) || blockListFromCache.includes(username);
  return isBlocked;
}
