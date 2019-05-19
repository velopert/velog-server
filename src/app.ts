import Koa, { Context } from 'koa';
import bodyParser from 'koa-bodyparser';
import { ApolloServer } from 'apollo-server-koa';
import { createConnection } from 'typeorm';
import logger from 'koa-logger';
import routes from './routes';
import schema from './graphql/schema';
import { consumeUser } from './lib/token';

const app = new Koa();

/* setup middlewares */
app.use(bodyParser());
app.use(consumeUser);
app.use(routes.routes()).use(routes.allowedMethods());
if (process.env.NODE_ENV === 'development') {
  app.use(logger());
}
const apollo = new ApolloServer({
  schema,
  context: async ({ ctx }: { ctx: Context }) => {
    try {
      // await consumeUser(ctx);
      return {
        user_id: ctx.state.user_id
      };
    } catch (e) {
      return {};
    }
  },
  tracing: process.env.NODE_ENV === 'development'
});
apollo.applyMiddleware({ app });

/**
 * initial tasks except Koa middlewares
 */
async function initialize() {
  try {
    await createConnection();
    console.log('Postgres RDBMS connection is established');
  } catch (e) {
    console.log(e);
  }
}

initialize();

export default app;
