import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { ApolloServer, gql } from 'apollo-server-koa';
import routes from './routes';

const app = new Koa();

/* setup middlewares */
app.use(bodyParser());
app.use(routes.routes()).use(routes.allowedMethods());

/* integrate GraphQL */
const typeDefs = gql`
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello World!'
  }
};

const apollo = new ApolloServer({ typeDefs, resolvers });
apollo.applyMiddleware({ app });

export default app;
