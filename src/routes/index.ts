import Router from '@koa/router';
import api from './api/index';
import { getRepository } from 'typeorm';
import Tag from '../entity/Tag';
import loadVariables from '../loadVariable';
import rss from './api/rss';

const routes = new Router();

routes.use('/api', api.routes());
routes.use('/rss', rss.routes());

routes.get('/', ctx => {
  ctx.body = 'hello world!';
});

export default routes;
