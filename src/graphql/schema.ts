import merge from 'lodash/merge';
import * as post from './post';
import * as user from './user';
import { gql, IResolvers, makeExecutableSchema } from 'apollo-server-koa';

const typeDef = gql`
  scalar JSON
  type Query {
    _version: String
  }
`;

const resolvers: IResolvers = {
  Query: {
    _version: () => '1.0'
  }
};

const schema = makeExecutableSchema({
  typeDefs: [typeDef, user.typeDef, post.typeDef],
  resolvers: merge(resolvers, user.resolvers, post.resolvers)
});

export default schema;
