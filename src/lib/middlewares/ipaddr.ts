import { Middleware } from 'koa';

export const ipaddr: Middleware = (ctx, next) => {
  const graphCdnAddr = ctx.request.headers['gcdn-client-ip'];
  ctx.state.ipaddr = graphCdnAddr || ctx.request.ips.slice(-1)[0] || ctx.request.ip;
  return next();
};
