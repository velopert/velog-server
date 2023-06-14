import Router from '@koa/router';
import api from './api/index';
import { getRepository } from 'typeorm';
import Tag from '../entity/Tag';
import loadVariables from '../loadVariable';
import rss from './rss';
import sitemaps from './sitemaps';
import PostRead from '../entity/PostRead';
import { BigQuery } from '@google-cloud/bigquery';
import { createReadLog } from '../lib/bigQuery';
import { container } from 'tsyringe';
import UserService from '../services/userService';

const bigQueryClient = new BigQuery({
  projectId: 'velog-14',
});

const routes = new Router();

routes.use('/api', api.routes());
routes.use('/(rss|atom)', rss.routes());
routes.use('/sitemaps', sitemaps.routes());
// Following route is for velog v1 compat
// Delete me on 2021
// routes.use('/atom', rss.routes());

routes.get('/', async ctx => {
  const userService = container.resolve(UserService);

  console.log(
    'userService',
    await userService.findUserById('72fa8bd9-8d7a-44d0-bb69-135511d28bb1')
  );
  ctx.body = {
    message: 'hello world',
    ips: ctx.state.ipaddr,
  };
});

export default routes;
