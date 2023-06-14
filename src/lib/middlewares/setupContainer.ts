import { Middleware } from 'koa';
import { container } from 'tsyringe';
import db from '../db';

export const setupContainer: Middleware = (_, next) => {
  console.log('등록');
  container.registerInstance('db', db);
  next();
};
