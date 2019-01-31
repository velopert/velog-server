import merge from 'lodash/merge';
import * as post from './post';
import * as user from './user';
import * as comment from './comment';
import { gql, IResolvers, makeExecutableSchema } from 'apollo-server-koa';
import DateScalar from './scalars/dateScalar';

const typeDef = gql`
  scalar JSON
  scalar Date
  type Query {
    _version: String
  }
`;

const resolvers: IResolvers = {
  Query: {
    _version: () => '1.0'
  },
  Date: DateScalar
};

const schema = makeExecutableSchema({
  typeDefs: [typeDef, user.typeDef, post.typeDef, comment.typeDef],
  resolvers: merge(resolvers, user.resolvers, post.resolvers, comment.resolvers)
});

export default schema;
