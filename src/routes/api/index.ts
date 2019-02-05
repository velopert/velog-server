import Router from 'koa-router';
import auth from './auth/auth';

const api = new Router();

api.get('/check', ctx => {
  ctx.body = {
    version: 'v2.0'
  };
});

api.use('/auth', auth.routes());

export default api;
