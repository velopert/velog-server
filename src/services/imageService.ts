import UserImageCloudflare from '../entity/UserImageCloudflare';
import { getRepository, MoreThan } from 'typeorm';
import { sendSlackMessage } from '../lib/sendSlackMessage';
import User from '../entity/User';

const imageService = {
  get userImageCloudflareRepo() {
    return getRepository(UserImageCloudflare);
  },

  async getImagesOf(postId: string) {
    const images = await this.userImageCloudflareRepo.find({
      where: {
        ref_id: postId,
      },
    });
    return images;
  },

  async untrackPastImages(userId: string) {
    const images = await this.userImageCloudflareRepo.find({
      where: {
        type: 'profile',
        tracked: true,
        fk_user_id: userId,
      },
      order: {
        created_at: 'DESC',
      },
    });

    if (images.length < 2) return;
    // remove first one
    const [_, ...rest] = images;
    rest.forEach(item => {
      item.tracked = false;
    });
    await this.userImageCloudflareRepo.save(rest);
  },

  async trackImages(images: UserImageCloudflare[], body: string) {
    for (let image of images) {
      if (body.includes(image.result_id)) {
        image.tracked = true;
      } else {
        image.tracked = false;
      }
    }
    return this.userImageCloudflareRepo.save(images);
  },

  async untrackImagesOfDeletedPost(postId: string) {
    const images = await this.userImageCloudflareRepo.find({
      where: {
        type: 'post',
        ref_id: postId,
      },
    });
    console.log(`Untracking ${images.length} images of post ${postId}`);
    images.forEach(image => {
      image.tracked = false;
    });
    return this.userImageCloudflareRepo.save(images);
  },

  async detectAbuse(userId: string) {
    const imageCountLastHour = await this.userImageCloudflareRepo.count({
      where: {
        fk_user_id: userId,
        created_at: MoreThan(new Date(Date.now() - 1000 * 60 * 60).toISOString()),
      },
    });

    if (imageCountLastHour > 100) {
      const username = (await getRepository(User).findOne(userId))?.username;
      sendSlackMessage(
        `User ${username} (${userId}) has uploaded ${imageCountLastHour} images in the last hour.`
      );

      // should block upload
      if (imageCountLastHour > 500) {
        sendSlackMessage(`User ${username} (${userId}) is blocked due to upload abuse.`);
        return true;
      }
    }

    const imageCountLastTenSeconds = await this.userImageCloudflareRepo.count({
      where: {
        fk_user_id: userId,
        created_at: MoreThan(new Date(Date.now() - 1000 * 10).toISOString()),
      },
    });

    if (imageCountLastTenSeconds > 15) {
      const username = (await getRepository(User).findOne(userId))?.username;
      sendSlackMessage(
        `User ${username} (${userId}) is blocked due to uploading ${imageCountLastTenSeconds} images in the last 10 seconds. `
      );
      return true;
    }

    return false;
  },
};

export default imageService;
