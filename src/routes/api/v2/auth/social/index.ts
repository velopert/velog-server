import Router from '@koa/router';
import { githubCallback, socialRedirect, getSocialProfile, socialRegister } from './social.ctrl';

const social = new Router();

/* LOGIN & REGISTER */
social.post('/verify-social/:provider', async ctx => {});
social.post('/register', socialRegister);
social.post('/login/:provider', async ctx => {});

/* Callback */
social.get('/callback/github', githubCallback);
social.get('/callback/google', async () => {});
social.get('/callback/facebook', async () => {});

/* Login Token */
social.get('/profile', getSocialProfile);
social.get('/redirect/:provider', socialRedirect);

export default social;
