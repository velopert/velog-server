import Router from 'koa-router';
import auth from './auth/auth';
import { consumeUser } from '../../../lib/token';

const v2 = new Router();

v2.get('/check', ctx => {
  ctx.body = {
    version: 'v2'
  };
});

v2.get('/test', async ctx => {
  await consumeUser(ctx);
  ctx.body = {
    user_id: ctx.state.user_id
  };
});

v2.use('/auth', auth.routes());

export default v2;
