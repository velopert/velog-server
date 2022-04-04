import '../env';
import Database from '../database';
import UserImageCloudflare from '../entity/UserImageCloudflare';
import { getRepository, LessThan } from 'typeorm';
import PQueue from 'p-queue';
import cloudflareImages from '../lib/cloudflareImages';
import { resolve } from 'dns';

async function initialize() {
  try {
    const database = new Database();
    await database.getConnection();
  } catch (e) {
    console.log(e);
  }
}

async function bulkRemoveImages(images: UserImageCloudflare[]) {
  const repo = getRepository(UserImageCloudflare);
  const queue = new PQueue({ concurrency: 15, intervalCap: 50, interval: 60000 });
  console.log(`removing ${images.length} images`);

  images.forEach(image => {
    queue.add(async () => {
      try {
        await cloudflareImages.delete(image.result_id);
      } catch (e) {
        console.log('Failed to remove', image.result_id);
        console.error(e);
      }
      await repo.delete(image.id);
    });
  });

  let counter = 0;
  queue.on('next', () => {
    console.log(`${counter} / ${images.length}`);
    counter += 1;
  });

  await queue.onIdle();
}

async function removeAllUntrackedImages() {
  // load all cf images
  const repo = getRepository(UserImageCloudflare);

  const beforeThreeDays = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString();
  const images = await repo.find({
    where: {
      tracked: false,
      created_at: LessThan(beforeThreeDays),
    },
  });

  return bulkRemoveImages(images);
}

async function removeImagesOfUser(userId: string) {
  const repo = getRepository(UserImageCloudflare);
  const images = await repo.find({
    where: {
      fk_user_id: userId,
    },
  });

  await bulkRemoveImages(images);
}

async function run() {
  await initialize();

  await removeAllUntrackedImages();
  // do sth
  process.exit();
}

run();
