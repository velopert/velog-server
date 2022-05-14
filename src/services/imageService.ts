import { getRepository, MoreThan } from 'typeorm';
import { sendSlackMessage } from '../lib/sendSlackMessage';
import User from '../entity/User';
import UserImageNext from '../entity/UserImageNext';

const { SLACK_IMAGE } = process.env;

const imageService = {
  get userImageRepo() {
    return getRepository(UserImageNext);
  },

  async getImagesOf(postId: string) {
    const images = await this.userImageRepo.find({
      where: {
        ref_id: postId,
      },
    });
    return images;
  },

  async untrackPastImages(userId: string) {
    const images = await this.userImageRepo.find({
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
    await this.userImageRepo.save(rest);
  },

  async trackImages(images: UserImageNext[], body: string) {
    for (let image of images) {
      if (body.includes(image.id)) {
        image.tracked = true;
      } else {
        image.tracked = false;
      }
    }
    return this.userImageRepo.save(images);
  },

  async untrackImagesOfDeletedPost(postId: string) {
    const images = await this.userImageRepo.find({
      where: {
        type: 'post',
        ref_id: postId,
      },
    });
    console.log(`Untracking ${images.length} images of post ${postId}`);
    images.forEach(image => {
      image.tracked = false;
    });
    return this.userImageRepo.save(images);
  },

  async detectAbuse(userId: string) {
    const imageCountLastHour = await this.userImageRepo.count({
      where: {
        fk_user_id: userId,
        created_at: MoreThan(new Date(Date.now() - 1000 * 60 * 60).toISOString()),
      },
    });

    if (imageCountLastHour > 100) {
      const username = (await getRepository(User).findOne(userId))?.username;
      sendSlackMessage(
        `User ${username} (${userId}) has uploaded ${imageCountLastHour} images in the last hour.`,
        SLACK_IMAGE
      );

      // should block upload
      if (imageCountLastHour > 500) {
        sendSlackMessage(
          `User ${username} (${userId}) is blocked due to upload abuse.`,
          SLACK_IMAGE
        );
        return true;
      }
    }

    const imageCountLastMinute = await this.userImageRepo.count({
      where: {
        fk_user_id: userId,
        created_at: MoreThan(new Date(Date.now() - 1000 * 60).toISOString()),
      },
    });

    if (imageCountLastMinute >= 20) {
      const username = (await getRepository(User).findOne(userId))?.username;
      sendSlackMessage(
        `User ${username} (${userId}) is blocked due to uploading ${imageCountLastMinute} images in a minute.`,
        SLACK_IMAGE
      );
      return true;
    }

    return false;
  },
};

export default imageService;
