import Router from 'koa-router';
import auth from './auth/auth';

const v2 = new Router();

v2.get('/check', ctx => {
  ctx.body = {
    version: 'v2'
  };
});

v2.use('/auth', auth.routes());

export default v2;
