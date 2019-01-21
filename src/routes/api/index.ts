import Router from 'koa-router';

const api = new Router();

api.get('/', ctx => {
  ctx.body = 'api';
});

export default api;
