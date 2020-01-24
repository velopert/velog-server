import Koa, { Context } from 'koa';
import bodyParser from 'koa-bodyparser';
import { ApolloServer } from 'apollo-server-koa';
import { createConnection, getConnectionManager } from 'typeorm';
import logger from 'koa-logger';
import routes from './routes';
import schema from './graphql/schema';
import { consumeUser } from './lib/token';
import createLoaders, { Loaders } from './lib/createLoader';
import entities from './entity';
import loadVariables from './loadVariable';
import cors from './lib/middlewares/cors';

const app = new Koa();

/* setup middlewares */
app.use(logger());
app.use(cors);
app.use(bodyParser());
app.use(consumeUser);
app.use(routes.routes()).use(routes.allowedMethods());

export type ApolloContext = {
  user_id: string | null;
  loaders: Loaders;
  ip: string;
  unsetCookie: () => void;
};

const apollo = new ApolloServer({
  schema,
  context: async ({ ctx }: { ctx: Context }) => {
    try {
      // await consumeUser(ctx);
      return {
        user_id: ctx.state.user_id,
        loaders: createLoaders(),
        ip: ctx.request.ip,
        unsetCookie: () => {
          ctx.cookies.set('access_token');
          ctx.cookies.set('referesh_token');
        }
      };
    } catch (e) {
      return {};
    }
  },
  tracing: process.env.NODE_ENV === 'development'
});
apollo.applyMiddleware({ app, cors: false });

export default app;
