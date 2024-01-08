import cache from '../cache';

export async function checkBlockList(userId: string) {
  const blockListFromEnv = (process.env.BLOCK_LIST ?? '').split(',');
  const blockListFromCache = await cache.readBlackList();
  const blockList = [...blockListFromEnv, ...blockListFromCache];

  return blockList.includes(userId);
}
