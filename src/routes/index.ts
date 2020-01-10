import Router from '@koa/router';
import api from './api/index';
import { getRepository } from 'typeorm';
import Tag from '../entity/Tag';
import loadVariables from '../loadVariable';

const routes = new Router();

routes.use('/api', api.routes());
routes.get('/variables', async ctx => {
  const variables = await loadVariables();
  ctx.body = variables;
});
routes.get('/something', async ctx => {
  const tagsRepo = getRepository(Tag);
  const tags = await tagsRepo.find({
    take: 10
  });
  ctx.body = {
    hello: 'world',
    tags
  };
});
routes.get('/', ctx => {
  ctx.body = 'hello world!';
});

export default routes;
