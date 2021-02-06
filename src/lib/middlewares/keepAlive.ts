import { Middleware } from 'koa';

let isClosing = false;
export const startClosing = () => {
  isClosing = true;
};

export const keepAlive: Middleware = (ctx, next) => {
  if (isClosing) {
    ctx.res.end();
  }
  next();
};
