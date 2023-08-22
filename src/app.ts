import Koa, { Context } from 'koa';
import bodyParser from 'koa-bodyparser';
import { ApolloServer } from 'apollo-server-koa';
import { createConnection, getConnectionManager, getConnection } from 'typeorm';
import logger from 'koa-logger';
import routes from './routes';
import schema from './graphql/schema';
import { consumeUser, resetTokenCookie } from './lib/token';
import createLoaders, { Loaders } from './lib/createLoader';
import entities from './entity';
import loadVariables from './loadVariable';
import cors from './lib/middlewares/cors';
import { keepAlive } from './lib/middlewares/keepAlive';
import { ipaddr } from './lib/middlewares/ipaddr';
import Cookies from 'cookies';

const app = new Koa();

/* setup middlewares */
app.proxy = true;
app.use(ipaddr);
app.use(logger());
app.use(cors);
app.use(bodyParser());
app.use(consumeUser);
app.use(routes.routes()).use(routes.allowedMethods());
app.use(keepAlive);

export type ApolloContext = {
  user_id: string | null;
  loaders: Loaders;
  ip: string;
  unsetCookie: () => void;
  cookies: Cookies;
};

const apollo = new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV === 'development',
  context: async ({ ctx }: { ctx: Context }) => {
    try {
      // await consumeUser(ctx);
      return {
        user_id: ctx.state.user_id,
        loaders: createLoaders(),
        ip: ctx.state.ipaddr,
        unsetCookie: () => {
          resetTokenCookie(ctx);
        },
        cookies: ctx.cookies,
      };
    } catch (e) {
      return {};
    }
  },
  tracing: process.env.NODE_ENV === 'development',
});
apollo.applyMiddleware({ app: app as any, cors: false });

export default app;
