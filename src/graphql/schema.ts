import merge from 'lodash/merge';
import * as post from './post';
import * as user from './user';
import * as comment from './comment';
import * as series from './series';
import * as tag from './tag';
import { gql, IResolvers, makeExecutableSchema } from 'apollo-server-koa';
import DateScalar from './scalars/dateScalar';

const typeDef = gql`
  scalar JSON
  scalar Date
  type Query {
    _version: String
  }
  type Mutation {
    _empty: String
  }
`;

const resolvers: IResolvers = {
  Query: {
    _version: () => '1.0'
  },
  Mutation: {},
  Date: DateScalar
};

const schema = makeExecutableSchema({
  typeDefs: [typeDef, user.typeDef, post.typeDef, comment.typeDef, series.typeDef, tag.typeDef],
  resolvers: merge(
    resolvers,
    user.resolvers,
    post.resolvers,
    comment.resolvers,
    series.resolvers,
    tag.resolvers
  )
});

export default schema;
