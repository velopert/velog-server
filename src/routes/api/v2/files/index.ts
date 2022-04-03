import Koa from 'koa';
import Router from '@koa/router';
import Joi from 'joi';
import { validateBody } from '../../../../lib/utils';
import AWS from 'aws-sdk';
import mime from 'mime-types';
import authorized from '../../../../lib/middlewares/authorized';
import UserImage from '../../../../entity/UserImage';
import { getRepository } from 'typeorm';
import createLoaders from '../../../../lib/createLoader';
import Axios from 'axios';
import multer from '@koa/multer';
import cloudflareImages from '../../../../lib/cloudflareImages';
import UserImageCloudflare from '../../../../entity/UserImageCloudflare';
import Post from '../../../../entity/Post';
import imageService from '../../../../services/imageService';

const BUCKET_NAME = 's3.images.velog.io';

const files = new Router();

const s3 = new AWS.S3({
  region: 'ap-northeast-2',
  signatureVersion: 'v4',
});

const slackUrl = `https://hooks.slack.com/services/${process.env.SLACK_TOKEN}`;

const blacklistUsername = (process.env.BLACKLIST_USERNAME ?? '').split(',');
const blacklistIp = (process.env.BLACKLIST_IP ?? '').split(',');

const generateSignedUrl = (path: string, filename: string) => {
  const contentType = mime.lookup(filename);
  if (!contentType) {
    const error = new Error('Failed to parse Content-Type from filename');
    error.name = 'ContentTypeError';
    throw error;
  }
  if (!contentType.includes('image')) {
    const error = new Error('Given file is not a image');
    error.name = 'ContentTypeError';
    throw error;
  }
  const uploadPath = `${path}/${filename}`;
  return s3.getSignedUrl('putObject', {
    Bucket: BUCKET_NAME,
    Key: uploadPath,
    ContentType: contentType,
  });
};

export const generateUploadPath = ({
  id,
  type,
  username,
}: {
  username: string;
  id: string;
  type: string;
}) => {
  return `images/${username}/${type}/${id}`;
};

files.post('/create-url', authorized, async ctx => {
  type RequestBody = {
    type: string;
    refId?: any;
    filename: string;
  };
  const schema = Joi.object().keys({
    type: Joi.string().valid('post', 'profile'),
    filename: Joi.string().required(),
    payload: Joi.any(),
  });

  if (!validateBody(ctx, schema)) return;

  const { type, filename, refId } = ctx.request.body as RequestBody;

  try {
    const user = await createLoaders().user.load(ctx.state.user_id);
    const userImage = new UserImage();
    userImage.fk_user_id = user.id;
    userImage.type = type;
    userImage.ref_id = refId || null;

    const userImageRepo = getRepository(UserImage);
    await userImageRepo.save(userImage);

    const path = generateUploadPath({ type, id: userImage.id, username: user.username });

    if (blacklistUsername.includes(user.username) || blacklistIp.includes(ctx.state.ipaddr)) {
      await Axios.post(slackUrl, {
        text: `blacklist uploaded image | ${ctx.ip} ${user.username}`,
      });
      // throw new Error('Server is offline.');
    }

    const signedUrl = generateSignedUrl(path, filename);
    userImage.path = `${path}/${filename}`;
    await userImageRepo.save(userImage);

    ctx.body = {
      image_path: `https://media.vlpt.us/${userImage.path}`,
      signed_url: signedUrl,
    };
  } catch (e) {
    if (e.name === 'ContentTypeError') {
      ctx.status = 401;
      return;
    }
    ctx.throw(500, e);
  }
});

const upload = multer({
  limits: {
    fileSize: 1024 * 1024 * 30,
  },
});
files.post('/upload', authorized, upload.single('image'), async ctx => {
  type RequestBody = {
    type: string;
    ref_id?: string;
  };
  const { type, ref_id } = ctx.request.body as RequestBody;
  if (!['post', 'profile'].includes(type)) {
    ctx.throw(400, 'Invalid type');
  }

  const userId = ctx.state.user_id;

  const isAbuse = await imageService.detectAbuse(userId);
  if (isAbuse) {
    // too many request
    ctx.throw(429, 'Too many request');
  }

  if (type === 'post') {
    const postRepo = getRepository(Post);
    const post = await postRepo.findOne(ref_id);
    if (post?.fk_user_id !== userId) {
      ctx.throw(403);
    }
  }

  const userImageCloudflare = new UserImageCloudflare();
  userImageCloudflare.filesize = ctx.request.file.size;
  userImageCloudflare.filename = ctx.request.file.originalname;
  userImageCloudflare.ref_id = ref_id ?? null;
  userImageCloudflare.type = type;
  userImageCloudflare.fk_user_id = userId;
  userImageCloudflare.tracked = false;

  if (type === 'profile') {
    userImageCloudflare.tracked = true;
  }

  try {
    const data = await cloudflareImages.upload(
      ctx.request.file.buffer,
      ctx.request.file.originalname
    );
    userImageCloudflare.result_id = data.result.id;
    ctx.body = data;

    const repo = getRepository(UserImageCloudflare);
    await repo.save(userImageCloudflare);
    ctx.body = {
      path: `https://imagedelivery.net/v7-TZByhOiJbNM9RaUdzSA/${data.result.id}/public`,
    };
  } catch (e) {
    ctx.throw(e);
    return;
  }

  setTimeout(() => {
    imageService.untrackPastImages(userId).catch(console.error);
  }, 0);
});

export default files;
