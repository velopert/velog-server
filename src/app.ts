import Koa, { Context } from 'koa';
import bodyParser from 'koa-bodyparser';
import { ApolloServer } from 'apollo-server-koa';
import { createConnection } from 'typeorm';
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

/**
 * initial tasks except Koa middlewares
 */
export async function initialize() {
  try {
    const variables = await loadVariables();
    const password = process.env.TYPEORM_PASSWORD || variables.rdsPassword;
    if (!password) {
      throw new Error('Failed to load database password');
    }

    await createConnection({
      entities,
      password,
      type: process.env.TYPEORM_CONNECTION as any,
      host: process.env.TYPEORM_HOST,
      database: process.env.TYPEORM_DATABASE,
      username: process.env.TYPEORM_USERNAME,
      port: parseInt(process.env.TYPEORM_PORT || '5432', 10),
      synchronize: process.env.SYNCHRONIZE === 'true'
    });
    console.log('Postgres RDBMS connection is established');
  } catch (e) {
    console.log('Failed to connect to database');
    console.log(e);
  }
}

export default app;
