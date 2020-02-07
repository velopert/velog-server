import Router from '@koa/router';
import auth from './auth';
import { consumeUser } from '../../../lib/token';
import files from './files';
import atom from './atom';

const v2 = new Router();

v2.get('/check', ctx => {
  ctx.body = {
    version: 'v2'
  };
});

v2.get('/test', async ctx => {
  ctx.body = {
    user_id: ctx.state.user_id
  };
});

v2.use('/auth', auth.routes());
v2.use('/files', files.routes());
v2.use('/atom', atom.routes());

export default v2;
