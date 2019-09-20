import Router from '@koa/router';
import v2 from './v2';

const api = new Router();
api.use('/v2', v2.routes());

export default api;
