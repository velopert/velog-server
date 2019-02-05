import Router from 'koa-router';
import { callbackify } from 'util';

const social = new Router();

/* LOGIN & REGISTER */
social.post('/verify-social/:provider', async ctx => {});
social.post('/register/:provider', async ctx => {});
social.post('/login/:provider', async ctx => {});

/* Callback */
social.get('/callback/github', async () => {});
social.get('/callback/google', async () => {});
social.get('/callback/facebook', async () => {});

/* Login Token */
social.get('/token', async () => {});

/* Redirect */
social.get('/redirect/:provider', async () => {});

export default social;
