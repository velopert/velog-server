import { Context } from 'koa';
import Joi, { SchemaLike } from 'joi';

export function normalize<T>(
  array: T[],
  selector: (item: T) => string | number = (item: any) => item.id
) {
  const object: {
    [key: string]: T;
  } = {};
  array.forEach(item => {
    object[selector(item)] = item;
  });
  return object;
}

export function groupById<T>(order: string[], data: T[], idResolver: (row: T) => string) {
  const map: {
    [key: string]: T[];
  } = {};
  // creates array for every key
  order.forEach(id => {
    map[id] = [];
  });
  data.forEach(row => {
    map[idResolver(row)].push(row);
  });
  const ordered = order.map(id => map[id]);
  return ordered;
}

/***
 * Validates Request Body with Joi
 */
export const validateBody = (ctx: Context, schema: SchemaLike) => {
  const validation = Joi.validate(ctx.request.body, schema);
  if (validation.error) {
    ctx.status = 400;
    ctx.body = {
      name: 'WRONG_SCHEMA',
      payload: validation.error
    };
    return false;
  }
  return true;
};
