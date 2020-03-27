import Router from '@koa/router';
import api from './api/index';
import { getRepository } from 'typeorm';
import Tag from '../entity/Tag';
import loadVariables from '../loadVariable';
import rss from './rss';
import sitemaps from './sitemaps';

const routes = new Router();

routes.use('/api', api.routes());
routes.use('/(rss|atom)', rss.routes());
routes.use('/sitemaps', sitemaps.routes());
// Following route is for velog v1 compat
// Delete me on 2021
// routes.use('/atom', rss.routes());

routes.get('/', ctx => {
  ctx.body = 'hello world!';
});

export default routes;
