import UserImageCloudflare from '../entity/UserImageCloudflare';
import { getRepository, MoreThan } from 'typeorm';
import { sendSlackMessage } from '../lib/sendSlackMessage';
import User from '../entity/User';

const { SLACK_IMAGE } = process.env;

const formatByte = (byte: number) => {
  if (byte < 1024) {
    return `${byte}B`;
  }
  if (byte < 1024 * 1024) {
    return `${Math.round(byte / 1024)}KB`;
  }
  return `${Math.round(byte / 1024 / 1024)}MB`;
};

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

  /** for abuse monitoring */
  async notifyImageUploadResult({
    username,
    image,
    userImageCloudflare,
  }: {
    username: string;
    image: string;
    userImageCloudflare: UserImageCloudflare;
  }) {
    const { fk_user_id, type, filesize, filename, ref_id } = userImageCloudflare;
    sendSlackMessage(`*${username}* (${fk_user_id})
*size*: ${formatByte(filesize)}
*type*: ${type}
*ref_id*: ${ref_id}
$filename*: ${filename}
${image.replace('/public', '/128x128')}`);
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

    const imageCountLastMinute = await this.userImageCloudflareRepo.count({
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
