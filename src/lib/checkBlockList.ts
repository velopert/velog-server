const blockList = (process.env.BLOCK_LIST ?? '').split(',');

export function checkBlockList(userId: string) {
  return blockList.includes(userId);
}
