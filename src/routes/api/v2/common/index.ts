import Router = require('@koa/router');
import { unsubscribeEmail } from './common.ctrl';

const common = new Router();
common.get('/email/unsubscribe', unsubscribeEmail);

export default common;
