import { Middleware } from '@koa/router';
import { decodeToken } from '../../../../lib/token';
import { getRepository } from 'typeorm';
import UserMeta from '../../../../entity/UserMeta';

type UnsubscribeEmailToken = {
  meta: string;
  user_id: string;
  sub: string;
};
export const unsubscribeEmail: Middleware = async ctx => {
  if (!ctx.query.token) {
    ctx.throw(400);
    return;
  }

  try {
    const { meta, user_id, sub } = await decodeToken<UnsubscribeEmailToken>(ctx.query.token);
    if (sub !== 'unsubscribe-email') {
      ctx.throw(403);
      return;
    }
    const userMeta = await getRepository(UserMeta).findOne({ fk_user_id: user_id });
    if (!userMeta) {
      ctx.throw(404);
      return;
    }
    if (meta === 'email_notification') {
      userMeta.email_notification = false;
      await getRepository(UserMeta).save(userMeta);
    }
  } catch (e) {
    ctx.throw(403);
  }

  ctx.redirect('https://velog.io/success?type=unsubscribe_email');
};
