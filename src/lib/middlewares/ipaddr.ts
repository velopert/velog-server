import { Middleware } from 'koa';

export const ipaddr: Middleware = (ctx, next) => {
  ctx.state.ipaddr = ctx.request.ips.slice(-1)[0] || ctx.request.ip;
  return next();
};
