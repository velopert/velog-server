import { Middleware } from 'koa';

const cors: Middleware = (ctx, next) => {
  /*
    velog.io
    alpha.velog.io
    dev--velog.netlify.com
  */
  const allowedHosts = [
    /^https:\/\/velog.io$/,
    /^https:\/\/alpha.velog.io$/,
    /https:\/\/(.*)--velog.netlify.com/
  ];
  const { origin } = ctx.headers;
  const valid = allowedHosts.some(regex => regex.test(ctx.headers.origin));
  if (!valid) return next();
  ctx.set('Access-Control-Allow-Origin', origin);
  ctx.set('Access-Control-Allow-Credentials', 'true');
  if (ctx.method === 'OPTIONS') {
    ctx.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, Cookie'
    );
    ctx.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,POST,DELETE,PATCH');
  }
  return next();
};

export default cors;
